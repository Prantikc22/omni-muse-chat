import { useState, useEffect } from 'react';
import { Message, Conversation, ModelType } from '@/types/chat';
import { openRouterService } from '@/services/openrouter';
import { kieService } from '@/services/kie';
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

  const sendMessage = async (content: string, modelType: ModelType): Promise<void> => {
    let conversationId = activeConversation;
    
    if (!conversationId) {
      conversationId = createConversation();
    }

    // Add user message
    const userMessage: Message = {
      id: crypto.randomUUID(),
      content,
      role: 'user',
      timestamp: new Date(),
      type: modelType === 'image' ? 'image' : modelType === 'code' ? 'code' : 'text',
      model: modelType,
    };

    addMessage(conversationId, userMessage);
    setIsLoading(true);

    try {
      const currentConv = conversations.find(c => c.id === conversationId);
      const messages = [...(currentConv?.messages || []), userMessage].map(msg => ({
        role: msg.role,
        content: msg.content,
      }));

      let response: string;
      let images: string[] | undefined;
      
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
            const imageUrl = await kieService.generateImage({
              prompt: content,
              aspectRatio: '1:1'
            });
            response = `Generated image for: "${content}"`;
            images = [imageUrl];
          } catch (error: any) {
            throw new Error(`Image generation failed: ${error.message}`);
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
        type: modelType === 'image' ? 'image' : modelType === 'code' ? 'code' : 'text',
        model: modelType,
        images,
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