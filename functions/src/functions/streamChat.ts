import { onRequest } from 'firebase-functions/v2/https';
import { verifyAuth, AuthError } from '../middleware/auth.js';
import { getModelConfig, calculateCostCents } from '../config/models.js';
import { tierCanAccessCategory, TIER_CONFIGS } from '../config/tiers.js';
import {
  getBalance,
  reserveCredits,
  reconcileReservation,
  refundReservation,
  InsufficientBalanceError,
  type CreditReservation,
} from '../services/credits.js';
import { recordUsage } from '../services/usage.js';
import {
  streamFromOpenRouter,
  getGenerationInfo,
  estimateTokenCount,
} from '../services/openrouter.js';

export const streamChat = onRequest(
  {
    region: 'us-central1',
    timeoutSeconds: 300,
    memory: '256MiB',
    cors: true,
    maxInstances: 100,
  },
  async (req, res) => {
    // CORS preflight
    if (req.method === 'OPTIONS') {
      res.status(204).send('');
      return;
    }
    if (req.method !== 'POST') {
      res.status(405).json({ error: 'Method not allowed' });
      return;
    }

    // 1. Authenticate
    let uid: string;
    try {
      const decoded = await verifyAuth(req);
      uid = decoded.uid;
    } catch (err) {
      const status = err instanceof AuthError ? 401 : 500;
      res.status(status).json({ error: (err as Error).message });
      return;
    }

    // 2. Parse and validate request
    const { model: modelId, messages: rawMessages, webSearch } = req.body;
    if (!modelId || !rawMessages || !Array.isArray(rawMessages)) {
      res.status(400).json({ error: 'Missing model or messages' });
      return;
    }

    // Validate and sanitize each message to prevent token estimation bypass
    // and arbitrary field injection into OpenRouter
    const VALID_ROLES = ['system', 'user', 'assistant'] as const;
    type ValidRole = (typeof VALID_ROLES)[number];
    const validRoleSet = new Set<string>(VALID_ROLES);
    const messages: Array<{ role: ValidRole; content: string }> = [];
    for (const msg of rawMessages) {
      if (!msg || typeof msg !== 'object') {
        res.status(400).json({ error: 'Each message must be an object' });
        return;
      }
      if (typeof msg.content !== 'string') {
        res.status(400).json({ error: 'Each message content must be a string' });
        return;
      }
      if (!validRoleSet.has(msg.role)) {
        res.status(400).json({ error: `Invalid message role: ${msg.role}` });
        return;
      }
      messages.push({ role: msg.role as ValidRole, content: msg.content });
    }

    // 3. Validate model
    const modelConfig = getModelConfig(modelId);
    if (!modelConfig) {
      res.status(400).json({ error: `Unknown model: ${modelId}` });
      return;
    }

    // 4. Check tier access
    let balance;
    try {
      balance = await getBalance(uid);
    } catch {
      res.status(500).json({ error: 'Failed to load user profile' });
      return;
    }

    if (!tierCanAccessCategory(balance.tier, modelConfig.category)) {
      const tierConfig = TIER_CONFIGS[balance.tier];
      res.status(403).json({
        error: `Your ${balance.tier} plan does not include ${modelConfig.category} models. Upgrade to access ${modelConfig.displayName}.`,
        requiredAccess: modelConfig.category,
        currentTier: balance.tier,
        allowedCategories: tierConfig.modelAccess,
      });
      return;
    }

    // 5. Check web search access
    if (webSearch && !TIER_CONFIGS[balance.tier].webSearchEnabled) {
      res.status(403).json({
        error: 'Web search is not available on your plan. Upgrade to Pro or Max.',
      });
      return;
    }

    // 6. Reserve credits atomically (prevents concurrent request abuse)
    const inputText = messages.map((m: { content: string }) => m.content).join(' ');
    const estimatedInputTokens = estimateTokenCount(inputText);
    const estimatedOutputTokens = 2000; // generous estimate to reduce under-reservation
    const { userCostCents: estimatedCost } = calculateCostCents(
      modelId,
      estimatedInputTokens,
      estimatedOutputTokens
    );

    let reservation: CreditReservation;
    try {
      reservation = await reserveCredits(uid, Math.max(estimatedCost, 1));
    } catch (err) {
      if (err instanceof InsufficientBalanceError) {
        res.status(402).json({
          error: 'Insufficient credits. Please top up or upgrade your plan.',
          balance: err.balance,
          estimatedCost,
        });
        return;
      }
      throw err;
    }

    // 7. Set SSE headers and begin streaming
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');

    let generationId: string | null = null;
    let completionContent = '';

    try {
      const openRouterResponse = await streamFromOpenRouter({
        model: modelId,
        messages,
        webSearch: !!webSearch,
      });

      const reader = openRouterResponse.body?.getReader();
      if (!reader) {
        await refundReservation(reservation).catch((refundErr) =>
          console.error('Failed to refund reservation:', refundErr)
        );
        res.write(`data: ${JSON.stringify({ error: 'No response body from OpenRouter' })}\n\n`);
        res.end();
        return;
      }

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        buffer += chunk;

        // Forward the raw chunk to the client
        res.write(chunk);

        // Parse for generation ID and content tracking
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ') && line.slice(6) !== '[DONE]') {
            try {
              const parsed = JSON.parse(line.slice(6));
              // Track generation ID
              if (parsed.id && !generationId) {
                generationId = parsed.id;
              }
              // Track completion content for token estimation fallback
              const delta = parsed.choices?.[0]?.delta?.content;
              if (delta) {
                completionContent += delta;
              }
            } catch {
              // Ignore parse errors
            }
          }
        }
      }
    } catch (err) {
      if (completionContent.length > 0) {
        // Partial stream: charge for tokens already delivered to the client
        const partialPromptTokens = estimateTokenCount(inputText);
        const partialCompletionTokens = estimateTokenCount(completionContent);
        const { userCostCents: partialCost } = calculateCostCents(
          modelId,
          partialPromptTokens,
          partialCompletionTokens
        );
        await reconcileReservation(reservation, partialCost, {
          modelId,
          promptTokens: partialPromptTokens,
          completionTokens: partialCompletionTokens,
        }).catch((reconcileErr) =>
          console.error('Failed to reconcile partial reservation:', reconcileErr)
        );
      } else {
        // No tokens delivered: full refund is appropriate
        await refundReservation(reservation).catch((refundErr) =>
          console.error('Failed to refund reservation:', refundErr)
        );
      }
      console.error('Stream error:', err);
      res.write(
        `data: ${JSON.stringify({ error: 'An error occurred while processing your request.' })}\n\n`
      );
      res.end();
      return;
    }

    // 8. Calculate actual cost
    let promptTokens: number;
    let completionTokens: number;

    if (generationId) {
      // Try to get exact token counts from OpenRouter
      const genInfo = await getGenerationInfo(generationId);
      if (genInfo) {
        promptTokens = genInfo.promptTokens;
        completionTokens = genInfo.completionTokens;
      } else {
        // Fallback to estimation
        promptTokens = estimateTokenCount(inputText);
        completionTokens = estimateTokenCount(completionContent);
      }
    } else {
      promptTokens = estimateTokenCount(inputText);
      completionTokens = estimateTokenCount(completionContent);
    }

    const { userCostCents } = calculateCostCents(
      modelId,
      promptTokens,
      completionTokens
    );

    // 9. Reconcile reservation with actual cost
    let deductionResult;
    try {
      deductionResult = await reconcileReservation(reservation, userCostCents, {
        modelId,
        promptTokens,
        completionTokens,
      });
    } catch (err) {
      console.error('Credit reconciliation failed:', err);
      // Don't fail the response — the user already got their answer.
      // Log for manual reconciliation. Leave deductionResult undefined so
      // the client knows to refresh balance from the server.
      deductionResult = null;
    }

    // 10. Record usage
    try {
      await recordUsage(uid, modelId, promptTokens, completionTokens, userCostCents);
    } catch (err) {
      console.error('Usage recording failed:', err);
    }

    // 11. Send final usage event
    const usageEvent: Record<string, unknown> = {
      type: 'usage',
      cost: userCostCents,
      promptTokens,
      completionTokens,
    };
    if (deductionResult) {
      usageEvent.balanceAfter = deductionResult;
    }
    res.write(`data: ${JSON.stringify(usageEvent)}\n\n`);

    res.end();
  }
);
