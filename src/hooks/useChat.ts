import { useState, useEffect } from 'react';
import { Message, Conversation, ModelType } from '@/types/chat';
import { openRouterService } from '@/services/openrouter';
import { kieService, kieVideoService } from '@/services/kie';
import { toast } from 'sonner';

export const useChat = () => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversation, setActiveConversation] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Load conversations from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('chat-conversations');
    if (saved) {
      const parsed = JSON.parse(saved);
      // Convert date strings back to Date objects
      const restored: Conversation[] = parsed.map((conv: any) => ({
        ...conv,
        createdAt: new Date(conv.createdAt),
        updatedAt: new Date(conv.updatedAt),
        messages: conv.messages.map((msg: any) => ({
          ...msg,
          timestamp: new Date(msg.timestamp),
        })),
      }));
      setConversations(restored);
      if (restored.length > 0 && !activeConversation) {
        setActiveConversation(restored[0].id);
      }
    }
  }, []);

  // Save conversations to localStorage whenever they change
  useEffect(() => {
    if (conversations.length > 0) {
      localStorage.setItem('chat-conversations', JSON.stringify(conversations));
    }
  }, [conversations]);

  const createConversation = (title: string = 'New Chat'): string => {
    const id = crypto.randomUUID();
    const newConversation: Conversation = {
      id,
      title,
      messages: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    setConversations(prev => [newConversation, ...prev]);
    setActiveConversation(id);
    return id;
  };

  const getCurrentConversation = (): Conversation | null => {
    if (!activeConversation) return null;
    return conversations.find(c => c.id === activeConversation) || null;
  };

  const addMessage = (conversationId: string, message: Message) => {
    setConversations(prev => prev.map(conv => {
      if (conv.id === conversationId) {
        const updatedMessages = [...conv.messages, message];
        return {
          ...conv,
          messages: updatedMessages,
          updatedAt: new Date(),
          // Update title with first user message if it's still "New Chat"
          title: conv.title === 'New Chat' && message.role === 'user' 
            ? message.content.slice(0, 50) + (message.content.length > 50 ? '...' : '')
            : conv.title,
        };
      }
      return conv;
    }));
  };

  const sendMessage = async (content: string, modelType: ModelType, fileData?: { name: string; content: string }): Promise<void> => {
    let conversationId = activeConversation;
    
    if (!conversationId) {
      conversationId = createConversation();
    }

    // Add user message
    let userMessage: Message = {
      id: crypto.randomUUID(),
      content,
      role: 'user',
      timestamp: new Date(),
      type: modelType.startsWith('video') ? 'video' : modelType === 'image' ? 'image' : modelType === 'code' ? 'code' : 'text',
      model: modelType,
    };

    // If fileData, add a user message for the file upload (for UI)
    if (fileData) {
      const fileSnippet = fileData.content.substring(0, 200) + (fileData.content.length > 200 ? '...' : '');
      const fileMsg: Message = {
        id: crypto.randomUUID(),
        content: '', // No main text, just file info
        role: 'user',
        timestamp: new Date(),
        type: 'text',
        model: modelType,
        fileName: fileData.name,
        fileSnippet,
      } as any;
      addMessage(conversationId, fileMsg);
    }

    addMessage(conversationId, userMessage);
    setIsLoading(true);

    try {
      const currentConv = conversations.find(c => c.id === conversationId);
      let messages = [...(currentConv?.messages || []), userMessage].map(msg => ({
        role: msg.role,
        content: msg.content,
      }));
      // If fileData is present, add it as a system message for context
      if (fileData) {
        messages = [
          { role: 'system', content: `The following document is attached for context: ${fileData.name}\n\n${fileData.content.substring(0, 15000)}` },
          ...messages
        ];
      }

      let response: string;
      let images: string[] | undefined;
      let videos: string[] | undefined;
      
      switch (modelType) {
        case 'code':
          try {
            response = await openRouterService.sendCodeMessage(messages);
          } catch (error: any) {
            if (error.message.includes('429')) {
              throw new Error('Code model is temporarily rate-limited. Please try again later or use the Chat model for code questions.');
            }
            throw error;
          }
          break;
        case 'image':
          try {
            const imageResult = await kieService.generateImage(content);
            response = 'Image generated successfully!';
            images = imageResult.images;
          } catch (error: any) {
            response = `Image generation failed: ${error.message}`;
          }
          break;
        case 'video-veo3':
          response = 'Generating video with Veo3 Fast... This may take a few minutes.';
          try {
            videos = await kieVideoService.generateVideoComplete({
              prompt: content,
              model: 'veo3_fast',
              aspectRatio: '16:9',
              enableFallback: true,
            });
            response = `Video generated successfully with Veo3 Fast model! ${videos.length} video(s) created.`;
          } catch (error: any) {
            throw new Error(`Video generation failed: ${error.message}`);
          }
          break;
        case 'video-bytedance':
          response = 'Generating video with ByteDance V1 Pro... This may take a few minutes.';
          try {
            videos = await kieVideoService.generateVideoComplete({
              prompt: content,
              model: 'bytedance/v1-pro-text-to-video',
              aspectRatio: '16:9',
              enableFallback: true,
            });
            response = `Video generated successfully with ByteDance V1 Pro model! ${videos.length} video(s) created.`;
          } catch (error: any) {
            throw new Error(`Video generation failed: ${error.message}`);
          }
          break;
        default:
          response = await openRouterService.sendChatMessage(messages);
      }

      // Add assistant message
      const assistantMessage: Message = {
        id: crypto.randomUUID(),
        content: response,
        role: 'assistant',
        timestamp: new Date(),
        type: modelType.startsWith('video') ? 'video' : modelType === 'image' ? 'image' : modelType === 'code' ? 'code' : 'text',
        model: modelType,
        images,
        videos,
      };

      addMessage(conversationId, assistantMessage);
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const deleteConversation = (conversationId: string) => {
    setConversations(prev => prev.filter(c => c.id !== conversationId));
    if (activeConversation === conversationId) {
      const remaining = conversations.filter(c => c.id !== conversationId);
      setActiveConversation(remaining.length > 0 ? remaining[0].id : null);
    }
  };

  return {
    conversations,
    activeConversation,
    setActiveConversation,
    getCurrentConversation,
    createConversation,
    sendMessage,
    deleteConversation,
    isLoading,
  };
};