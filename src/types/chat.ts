export interface Message {
  id: string;
  content: string;
  role: 'user' | 'assistant' | 'system';
  timestamp: Date;
  type: 'text' | 'code' | 'image' | 'video';
  model: ModelType;
  images?: string[];
  videos?: string[];
  fileName?: string;
  fileSnippet?: string;
}

export interface Conversation {
  id: string;
  title: string;
  messages: Message[];
  createdAt: Date;
  updatedAt: Date;
}

export type ModelType = 'chat' | 'code' | 'image' | 'video-veo3' | 'video-bytedance' | 'analyzer';;

export interface ModelConfig {
  type: ModelType;
  name: string;
  model: string;
  description: string;
}