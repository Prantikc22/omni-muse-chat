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

export interface KieImageResponse {
  taskId: string;
  images: string[];
}

export class KieService {
  async generateImage(prompt: string): Promise<KieImageResponse> {
    try {
      const response = await fetch(`${BASE_URL}/veo/generate`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt,
          model: 'dall-e-3',
          aspectRatio: '16:9',
          enableFallback: true,
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Kie API error: ${response.status} - ${error}`);
      }

      const data = await response.json();
      
      // Poll for completion if we get a task ID
      if (data.taskId) {
        return await this.pollForImageCompletion(data.taskId);
      }
      
      // If images are returned immediately
      return {
        taskId: data.taskId || 'immediate',
        images: data.images || [],
      };
    } catch (error) {
      console.error('Image generation error:', error);
      throw new Error(`Failed to generate image: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async pollForImageCompletion(taskId: string): Promise<KieImageResponse> {
    const maxAttempts = 30; // 5 minutes with 10-second intervals
    let attempts = 0;

    while (attempts < maxAttempts) {
      try {
        const response = await fetch(`${BASE_URL}/veo/get-video-details/${taskId}`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${API_KEY}`,
          },
        });

        if (!response.ok) {
          throw new Error(`Status check failed: ${response.status}`);
        }

        const data = await response.json();
        
        if (data.status === 'completed' && data.images) {
          return {
            taskId,
            images: data.images,
          };
        } else if (data.status === 'failed') {
          throw new Error(data.error || 'Image generation failed');
        }

        // Wait 10 seconds before next attempt
        await new Promise(resolve => setTimeout(resolve, 10000));
        attempts++;
      } catch (error) {
        console.error(`Polling attempt ${attempts + 1} failed:`, error);
        attempts++;
        await new Promise(resolve => setTimeout(resolve, 10000));
      }
    }

    throw new Error('Image generation timed out');
  }

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

export const kieService = new KieService();
export const kieVideoService = kieService; // Backwards compatibility