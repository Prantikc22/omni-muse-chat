export interface Message {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  timestamp: Date;
  type: 'text' | 'code' | 'image';
  model: ModelType;
  images?: string[];
}

export interface Conversation {
  id: string;
  title: string;
  messages: Message[];
  createdAt: Date;
  updatedAt: Date;
}

export type ModelType = 'chat' | 'code' | 'image';

export interface ModelConfig {
  type: ModelType;
  name: string;
  model: string;
  description: string;
}