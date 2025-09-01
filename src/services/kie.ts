const API_KEY = '58eea461e20a17dc223e46dfdab339a3';
const BASE_URL = 'https://api.kie.ai/api/v1/veo/generate';

export interface KieGenerateParams {
  prompt: string;
  aspectRatio?: '16:9' | '9:16' | '1:1' | '4:3' | '3:4';
  model?: 'veo3';
  watermark?: string;
  seeds?: number;
  enableFallback?: boolean;
}

export interface KieResponse {
  id?: string;
  status?: string;
  imageUrl?: string;
  error?: string;
  message?: string;
}

export class KieService {
  async generateImage(params: KieGenerateParams): Promise<string> {
    const payload = {
      prompt: params.prompt,
      model: params.model || 'veo3',
      aspectRatio: params.aspectRatio || '1:1',
      watermark: params.watermark || '',
      seeds: params.seeds || Math.floor(Math.random() * 100000),
      enableFallback: params.enableFallback || false,
    };

    const response = await fetch(BASE_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Kie.ai API error: ${response.status} - ${error}`);
    }

    const result: KieResponse = await response.json();
    
    if (result.error) {
      throw new Error(result.message || result.error);
    }

    return result.imageUrl || 'No image URL received';
  }
}

export const kieService = new KieService();