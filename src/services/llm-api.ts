import type { LLMModel, APIKeys, MessageNode } from '../types';

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

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
      messages.push({
        role: node.type === 'user' ? 'user' : 'assistant',
        content: node.content,
      });
    }

    return messages;
  }

  static async streamResponse(
    model: LLMModel,
    parentNode: MessageNode,
    allNodes: Record<string, MessageNode>,
    apiKeys: APIKeys,
    onToken: (token: string) => void,
    onComplete: () => void,
    onError: (error: string) => void
  ): Promise<void> {
    const context = this.buildContext(parentNode, allNodes);

    try {
      switch (model.provider) {
        case 'openai':
          await this.streamOpenAI(model, context, apiKeys.openai, onToken, onComplete, onError);
          break;
        case 'anthropic':
          await this.streamAnthropic(model, context, apiKeys.anthropic, onToken, onComplete, onError);
          break;
        case 'google':
          await this.streamGoogle(model, context, apiKeys.google, onToken, onComplete, onError);
          break;
        default:
          onError('Unknown provider');
      }
    } catch (error) {
      onError(error instanceof Error ? error.message : 'Unknown error');
    }
  }

  private static async streamOpenAI(
    model: LLMModel,
    messages: ChatMessage[],
    apiKey: string,
    onToken: (token: string) => void,
    onComplete: () => void,
    onError: (error: string) => void
  ): Promise<void> {
    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: model.name,
          messages,
          stream: true,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        onError(error.error?.message || 'OpenAI API error');
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
      onError(error instanceof Error ? error.message : 'OpenAI streaming error');
    }
  }

  private static async streamAnthropic(
    model: LLMModel,
    messages: ChatMessage[],
    apiKey: string,
    onToken: (token: string) => void,
    onComplete: () => void,
    onError: (error: string) => void
  ): Promise<void> {
    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: model.name,
          messages,
          max_tokens: 4096,
          stream: true,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        onError(error.error?.message || 'Anthropic API error');
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

            try {
              const parsed = JSON.parse(data);
              
              if (parsed.type === 'content_block_delta') {
                const token = parsed.delta?.text;
                if (token) {
                  onToken(token);
                }
              } else if (parsed.type === 'message_stop') {
                onComplete();
                return;
              }
            } catch {
              // Ignore parse errors
            }
          }
        }
      }

      onComplete();
    } catch (error) {
      onError(error instanceof Error ? error.message : 'Anthropic streaming error');
    }
  }

  private static async streamGoogle(
    model: LLMModel,
    messages: ChatMessage[],
    apiKey: string,
    onToken: (token: string) => void,
    onComplete: () => void,
    onError: (error: string) => void
  ): Promise<void> {
    try {
      // Convert messages to Google's format
      const contents = messages.map(msg => ({
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: msg.content }],
      }));

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model.name}:streamGenerateContent?key=${apiKey}&alt=sse`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            contents,
          }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        onError(error.error?.message || 'Google API error');
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

            try {
              const parsed = JSON.parse(data);
              const token = parsed.candidates?.[0]?.content?.parts?.[0]?.text;
              if (token) {
                onToken(token);
              }
            } catch {
              // Ignore parse errors
            }
          }
        }
      }

      onComplete();
    } catch (error) {
      onError(error instanceof Error ? error.message : 'Google streaming error');
    }
  }
}

