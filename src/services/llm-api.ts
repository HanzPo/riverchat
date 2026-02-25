import type { LLMModel, MessageNode, UsageMetadata } from '../types';
import { auth } from '../config/firebase';
import { captureException } from '../composables/usePostHog';

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

const STREAM_CHAT_URL = import.meta.env.VITE_STREAM_CHAT_URL || '';

export class LLMAPIService {
  private static buildContext(
    targetNode: MessageNode,
    allNodes: Record<string, MessageNode>
  ): ChatMessage[] {
    const messages: ChatMessage[] = [];
    const path: MessageNode[] = [];

    // Traverse upwards from target to root
    let currentNode: MessageNode | null | undefined = targetNode;
    while (currentNode) {
      path.unshift(currentNode);
      currentNode = currentNode.parentId ? allNodes[currentNode.parentId] : null;
    }

    // Convert to ChatMessage format
    for (const node of path) {
      let content = node.content;

      // If this node has branch metadata, add the highlighted text as context
      if (node.branchMetadata) {
        content = `[Selected text from previous message]\n"${node.branchMetadata.highlightedText}"\n\n${node.content}`;
      }

      messages.push({
        role: node.type === 'user' ? 'user' : 'assistant',
        content: content,
      });
    }

    return messages;
  }

  static async streamResponse(
    model: LLMModel,
    parentNode: MessageNode,
    allNodes: Record<string, MessageNode>,
    webSearchEnabled: boolean,
    onToken: (token: string) => void,
    onComplete: (usage?: UsageMetadata) => void,
    onError: (error: string) => void
  ): Promise<void> {
    const context = this.buildContext(parentNode, allNodes);

    try {
      await this.streamViaProxy(
        model,
        context,
        webSearchEnabled,
        onToken,
        onComplete,
        onError
      );
    } catch (error) {
      onError(error instanceof Error ? error.message : 'Unknown error');
    }
  }

  private static async streamViaProxy(
    model: LLMModel,
    messages: ChatMessage[],
    webSearchEnabled: boolean,
    onToken: (token: string) => void,
    onComplete: (usage?: UsageMetadata) => void,
    onError: (error: string) => void
  ): Promise<void> {
    try {
      // Get Firebase Auth ID token
      const user = auth.currentUser;
      if (!user) {
        onError('Not authenticated. Please sign in.');
        return;
      }
      const idToken = await user.getIdToken();

      if (!STREAM_CHAT_URL) {
        onError('Chat service URL not configured');
        return;
      }

      console.log(`[LLM] Streaming via proxy: ${model.id}${webSearchEnabled ? ' with web search' : ''}`);

      const response = await fetch(STREAM_CHAT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          model: model.id,
          messages,
          webSearch: webSearchEnabled,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        const errorMessage = error.error || `API error: ${response.status}`;

        captureException(new Error(errorMessage), {
          context: 'proxy_api',
          model: model.id,
          status: response.status,
          web_search_enabled: webSearchEnabled,
        });

        onError(errorMessage);
        return;
      }

      const reader = response.body?.getReader();
      if (!reader) {
        onError('No response body');
        return;
      }

      const decoder = new TextDecoder();
      let buffer = '';
      let usageData: UsageMetadata | undefined;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') {
              continue;
            }

            try {
              const parsed = JSON.parse(data);

              // Check for usage metadata (sent by our proxy after stream)
              if (parsed.type === 'usage') {
                usageData = {
                  cost: parsed.cost,
                  promptTokens: parsed.promptTokens,
                  completionTokens: parsed.completionTokens,
                  balanceAfter: parsed.balanceAfter,
                };
                continue;
              }

              // Check for error
              if (parsed.error) {
                onError(parsed.error);
                return;
              }

              // Standard OpenRouter SSE token
              const token = parsed.choices?.[0]?.delta?.content;
              if (token) {
                onToken(token);
              }
            } catch {
              // Ignore parse errors for partial JSON
            }
          }
        }
      }

      onComplete(usageData);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Streaming error';

      captureException(error instanceof Error ? error : new Error(errorMessage), {
        context: 'proxy_streaming',
        model: model.id,
        web_search_enabled: webSearchEnabled,
      });

      onError(errorMessage);
    }
  }
}
