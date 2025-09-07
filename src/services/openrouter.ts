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
      images?: Array<{
        type: string;
        image_url: {
          url: string;
        };
      }>;
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
    const chatModels = [
      'deepseek/deepseek-chat-v3.1:free',
      'openai/gpt-oss-120b:free',
      'moonshotai/kimi-k2:free',
      'tencent/hunyuan-a13b-instruct:free',
      'meta-llama/llama-4-maverick:free',
      'deepseek/deepseek-r1:free',
      'meta-llama/llama-3.1-405b-instruct:free',
      'google/gemini-2.5-pro-exp-03-25',
    ];
    for (const model of chatModels) {
      try {
        const response = await this.makeRequest(model, messages);
        if (response.choices[0]?.message?.content) {
          return response.choices[0].message.content;
        }
      } catch (err) {
        // try next model
      }
    }
    return 'No response received from any chat model';
  }

  async sendCodeMessage(messages: OpenRouterMessage[]): Promise<string> {
    const codeModels = [
      'qwen/qwen3-coder:free',
      'moonshotai/kimi-dev-72b:free',
      'agentica-org/deepcoder-14b-preview:free',
    ];
    for (const model of codeModels) {
      try {
        const response = await this.makeRequest(model, messages);
        if (response.choices[0]?.message?.content) {
          return response.choices[0].message.content;
        }
      } catch (err) {
        // try next model
      }
    }
    return 'No response received from any code model';
  }

  async sendImageMessage(messages: OpenRouterMessage[]): Promise<{ content: string; images?: string[] }> {
    const response = await this.makeRequest('google/gemini-2.5-flash-image-preview:free', messages);
    const choice = response.choices[0];
    const content = choice?.message?.content || 'No response received';
    const images = choice?.message?.images?.map(img => img.image_url.url) || [];
    
    return { content, images };
  }
}

export const openRouterService = new OpenRouterService();