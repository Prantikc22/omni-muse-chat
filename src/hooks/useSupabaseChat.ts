import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { kieService, kieVideoService } from '@/services/kie';
import { openRouterService } from '@/services/openrouter';
import { toast } from 'sonner';

export interface SupabaseMessage {
  id: string;
  conversation_id: string;
  role: 'user' | 'assistant';
  content: string;
  message_type: 'text' | 'code' | 'image' | 'video';
  model_type?: string;
  images?: string[];
  videos?: string[];
  attachments?: any[];
  created_at: string;
}

export interface SupabaseConversation {
  id: string;
  user_id: string;
  project_id?: string;
  title: string;
  created_at: string;
  updated_at: string;
  messages?: SupabaseMessage[];
}

export interface SupabaseProject {
  id: string;
  user_id: string;
  title: string;
  description?: string;
  created_at: string;
  updated_at: string;
}

export type ModelType = 'chat' | 'code' | 'image' | 'video-veo3' | 'video-bytedance';

export const useSupabaseChat = () => {
  const [conversations, setConversations] = useState<SupabaseConversation[]>([]);
  const [projects, setProjects] = useState<SupabaseProject[]>([]);
  const [activeConversation, setActiveConversation] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Load conversations and projects
  useEffect(() => {
    loadConversations();
    loadProjects();
  }, []);

  const loadConversations = async () => {
    try {
      const { data, error } = await supabase
        .from('conversations')
        .select(`
          *,
          messages (*)
        `)
        .order('updated_at', { ascending: false });

      if (error) throw error;
      setConversations(data as SupabaseConversation[] || []);
      
      if (data && data.length > 0 && !activeConversation) {
        setActiveConversation(data[0].id);
      }
    } catch (error) {
      console.error('Error loading conversations:', error);
    }
  };

  const loadProjects = async () => {
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .order('updated_at', { ascending: false });

      if (error) throw error;
      setProjects(data || []);
    } catch (error) {
      console.error('Error loading projects:', error);
    }
  };

  const createProject = async (title: string, description?: string): Promise<string | null> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('projects')
        .insert({ title, description, user_id: user.id })
        .select()
        .single();

      if (error) throw error;
      
      setProjects(prev => [data, ...prev]);
      toast.success('Project created successfully');
      return data.id;
    } catch (error) {
      console.error('Error creating project:', error);
      toast.error('Failed to create project');
      return null;
    }
  };

  const createConversation = async (title: string = 'New Chat', projectId?: string): Promise<string | null> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('conversations')
        .insert({ title, project_id: projectId, user_id: user.id })
        .select()
        .single();

      if (error) throw error;
      
      const newConv = { ...data, messages: [] };
      setConversations(prev => [newConv, ...prev]);
      setActiveConversation(data.id);
      return data.id;
    } catch (error) {
      console.error('Error creating conversation:', error);
      toast.error('Failed to create conversation');
      return null;
    }
  };

  const sendMessage = async (content: string, modelType: ModelType, attachments?: any[]): Promise<void> => {
    let conversationId = activeConversation;
    
    if (!conversationId) {
      conversationId = await createConversation();
      if (!conversationId) return;
    }

    setIsLoading(true);

    try {
      // Add user message to database
      const { data: userMessage, error: userError } = await supabase
        .from('messages')
        .insert([{
          conversation_id: conversationId,
          role: 'user',
          content,
          message_type: modelType.startsWith('video') ? 'video' : modelType === 'image' ? 'image' : modelType === 'code' ? 'code' : 'text',
          model_type: modelType,
          attachments: attachments || [],
        }])
        .select()
        .single();

      if (userError) throw userError;

      // Update conversations state
      setConversations(prev => prev.map(conv => {
        if (conv.id === conversationId) {
          return {
            ...conv,
            messages: [...(conv.messages || []), userMessage],
            title: conv.title === 'New Chat' ? content.slice(0, 50) + (content.length > 50 ? '...' : '') : conv.title,
          };
        }
        return conv;
      }));

      // Generate response based on model type
      let response: string;
      let images: string[] | undefined;
      let videos: string[] | undefined;

      // Get conversation history for context
      const { data: messages } = await supabase
        .from('messages')
        .select('role, content')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

      const messageHistory = messages?.map(msg => ({
        role: msg.role as 'user' | 'assistant',
        content: msg.content,
      })) || [];

      switch (modelType) {
        case 'image':
          try {
            const imageResult = await kieService.generateImage(content);
            response = 'Image generated successfully!';
            images = imageResult.images;
          } catch (error: any) {
            response = `Image generation failed: ${error.message}`;
          }
          break;
        case 'code':
          try {
            response = await openRouterService.sendCodeMessage(messageHistory);
          } catch (error: any) {
            if (error.message.includes('429')) {
              throw new Error('Code model is temporarily rate-limited. Please try again later or use the Chat model for code questions.');
            }
            throw error;
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
            response = `Video generation failed: ${error.message}`;
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
            response = `Video generation failed: ${error.message}`;
          }
          break;
        default:
          response = await openRouterService.sendChatMessage(messageHistory);
      }

      // Add assistant message to database
      const { data: assistantMessage, error: assistantError } = await supabase
        .from('messages')
        .insert([{
          conversation_id: conversationId,
          role: 'assistant',
          content: response,
          message_type: modelType.startsWith('video') ? 'video' : modelType === 'image' ? 'image' : modelType === 'code' ? 'code' : 'text',
          model_type: modelType,
          images,
          videos,
        }])
        .select()
        .single();

      if (assistantError) throw assistantError;

      // Update conversations state
      setConversations(prev => prev.map(conv => {
        if (conv.id === conversationId) {
          return {
            ...conv,
            messages: [...(conv.messages || []), assistantMessage],
          };
        }
        return conv;
      }));

    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const deleteConversation = async (conversationId: string) => {
    try {
      const { error } = await supabase
        .from('conversations')
        .delete()
        .eq('id', conversationId);

      if (error) throw error;

      setConversations(prev => prev.filter(c => c.id !== conversationId));
      if (activeConversation === conversationId) {
        const remaining = conversations.filter(c => c.id !== conversationId);
        setActiveConversation(remaining.length > 0 ? remaining[0].id : null);
      }
      toast.success('Conversation deleted');
    } catch (error) {
      console.error('Error deleting conversation:', error);
      toast.error('Failed to delete conversation');
    }
  };

  const getCurrentConversation = (): SupabaseConversation | null => {
    if (!activeConversation) return null;
    return conversations.find(c => c.id === activeConversation) || null;
  };

  return {
    conversations,
    projects,
    activeConversation,
    setActiveConversation,
    getCurrentConversation,
    createProject,
    createConversation,
    sendMessage,
    deleteConversation,
    isLoading,
    loadConversations,
    loadProjects,
  };
};