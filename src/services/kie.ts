const API_KEY = '58eea461e20a17dc223e46dfdab339a3';
const BASE_URL = 'https://api.kie.ai/api/v1';

export interface VideoGenerationRequest {
  prompt: string;
  model: 'veo3_fast' | 'bytedance/v1-pro-text-to-video';
  aspectRatio?: '16:9' | '9:16' | '1:1';
  enableFallback?: boolean;
}

export interface VideoGenerationResponse {
  code: number;
  msg: string;
  data: {
    taskId: string;
    status: string;
  };
}

export interface VideoStatusResponse {
  code: number;
  msg: string;
  data: {
    taskId: string;
    status: 'pending' | 'processing' | 'completed' | 'failed';
    info?: {
      resultUrls: string[];
      originUrls?: string[];
      resolution: string;
    };
    fallbackFlag?: boolean;
  };
}

export class KieVideoService {
  async generateVideo(request: VideoGenerationRequest): Promise<string> {
    const response = await fetch(`${BASE_URL}/veo/generate`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt: request.prompt,
        model: request.model,
        aspectRatio: request.aspectRatio || '16:9',
        enableFallback: request.enableFallback !== false,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Kie API error: ${response.status} - ${error}`);
    }

    const result: VideoGenerationResponse = await response.json();
    
    if (result.code !== 200) {
      throw new Error(`Video generation failed: ${result.msg}`);
    }

    return result.data.taskId;
  }

  async getVideoStatus(taskId: string): Promise<VideoStatusResponse> {
    const response = await fetch(`${BASE_URL}/veo/get-video-details/${taskId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Kie API error: ${response.status} - ${error}`);
    }

    return response.json();
  }

  async waitForVideoCompletion(taskId: string, maxWaitTime: number = 300000): Promise<string[]> {
    const startTime = Date.now();
    const pollInterval = 5000; // Poll every 5 seconds

    return new Promise((resolve, reject) => {
      const poll = async () => {
        try {
          if (Date.now() - startTime > maxWaitTime) {
            reject(new Error('Video generation timeout'));
            return;
          }

          const status = await this.getVideoStatus(taskId);
          
          if (status.code === 200 && status.data.status === 'completed') {
            const videoUrls = status.data.info?.resultUrls || [];
            if (videoUrls.length > 0) {
              resolve(videoUrls);
              return;
            }
          }
          
          if (status.data.status === 'failed') {
            reject(new Error(`Video generation failed: ${status.msg}`));
            return;
          }

          // Continue polling if still processing
          if (status.data.status === 'pending' || status.data.status === 'processing') {
            setTimeout(poll, pollInterval);
          } else {
            reject(new Error(`Unexpected status: ${status.data.status}`));
          }
        } catch (error) {
          reject(error);
        }
      };

      poll();
    });
  }

  async generateVideoComplete(request: VideoGenerationRequest): Promise<string[]> {
    const taskId = await this.generateVideo(request);
    return this.waitForVideoCompletion(taskId);
  }
}

export const kieVideoService = new KieVideoService();