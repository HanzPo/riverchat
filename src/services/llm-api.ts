import type { LLMModel, APIKeys, MessageNode } from '../types';
import { SHARED_OPENROUTER_API_KEY } from '../types';
import { captureException } from '../composables/usePostHog';

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';

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
    apiKeys: APIKeys,
    webSearchEnabled: boolean,
    onToken: (token: string) => void,
    onComplete: () => void,
    onError: (error: string) => void
  ): Promise<void> {
    const context = this.buildContext(parentNode, allNodes);

    try {
      await this.streamOpenRouter(
        model,
        context,
        apiKeys.openrouter || SHARED_OPENROUTER_API_KEY,
        webSearchEnabled,
        onToken,
        onComplete,
        onError
      );
    } catch (error) {
      onError(error instanceof Error ? error.message : 'Unknown error');
    }
  }

  private static async streamOpenRouter(
    model: LLMModel,
    messages: ChatMessage[],
    apiKey: string,
    webSearchEnabled: boolean,
    onToken: (token: string) => void,
    onComplete: () => void,
    onError: (error: string) => void
  ): Promise<void> {
    try {
      console.log(`[OpenRouter] Using model: ${model.id}${webSearchEnabled ? ' with web search' : ''}`);

      const requestBody: any = {
        model: model.id,
        messages,
        stream: true,
      };

      // Add web search plugin if enabled
      if (webSearchEnabled) {
        requestBody.plugins = [{ id: 'web' }];
      }

      const response = await fetch(OPENROUTER_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
          'HTTP-Referer': window.location.origin,
          'X-Title': 'RiverChat',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const error = await response.json();
        const errorMessage = error.error?.message || `OpenRouter API error: ${response.status}`;
        
        // Capture API error
        captureException(new Error(errorMessage), {
          context: 'openrouter_api',
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
              onComplete();
              return;
            }

            try {
              const parsed = JSON.parse(data);
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

      onComplete();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'OpenRouter streaming error';
      
      // Capture streaming error
      captureException(error instanceof Error ? error : new Error(errorMessage), {
        context: 'openrouter_streaming',
        model: model.id,
        web_search_enabled: webSearchEnabled,
      });
      
      onError(errorMessage);
    }
  }
}
