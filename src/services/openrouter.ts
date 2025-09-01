const API_KEY = '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';
const BASE_URL = 'https://openrouter.ai/api/v1';

export interface OpenRouterMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface OpenRouterResponse {
  id: string;
  choices: Array<{
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export class OpenRouterService {
  private async makeRequest(model: string, messages: OpenRouterMessage[]): Promise<OpenRouterResponse> {
    const response = await fetch(`${BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': window.location.origin,
      },
      body: JSON.stringify({
        model,
        messages,
        stream: false,
        max_tokens: 4000,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OpenRouter API error: ${response.status} - ${error}`);
    }

    return response.json();
  }

  async sendChatMessage(messages: OpenRouterMessage[]): Promise<string> {
    const response = await this.makeRequest('deepseek/deepseek-chat-v3.1:free', messages);
    return response.choices[0]?.message?.content || 'No response received';
  }

  async sendCodeMessage(messages: OpenRouterMessage[]): Promise<string> {
    const response = await this.makeRequest('qwen/qwen3-coder:free', messages);
    return response.choices[0]?.message?.content || 'No response received';
  }

  async sendImageMessage(messages: OpenRouterMessage[]): Promise<string> {
    const response = await this.makeRequest('google/gemini-2.5-flash-image-preview:free', messages);
    return response.choices[0]?.message?.content || 'No response received';
  }
}

export const openRouterService = new OpenRouterService();