// src/hooks/useSupabaseChat.ts
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { kieService, kieVideoService } from '@/services/kie';
import { openRouterService } from '@/services/openrouter';
import { toast } from 'sonner';
import type { OpenRouterMessage } from '@/services/openrouter';
import { webSearchSmart } from '@/services/websearch';
import { grantFreeTierToUser } from '@/services/billing';

export interface SupabaseMessage {
  id: string;
  conversation_id: string;
  role: 'user' | 'assistant'| 'system';
  content: string;
  message_type: 'text' | 'code' | 'image' | 'video';
  model_type?: string;
  images?: string[];
  videos?: string[];
  attachments?: any[];
  file_name?: string;
  file_snippet?: string;
  created_at: string;
  agent_id?: string | null;
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

export type ModelType = 'chat' | 'code' | 'image' | 'video-veo3' | 'video-bytedance' | 'analyzer';

export const useSupabaseChat = () => {
  const [conversations, setConversations] = useState<SupabaseConversation[]>([]);
  const [projects, setProjects] = useState<SupabaseProject[]>([]);
  const [agents, setAgents] = useState<any[]>([]);
  const [selectedAgent, setSelectedAgent] = useState<any | null>(null);
  const [activeConversation, setActiveConversation] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    loadConversations();
    loadProjects();
    loadAgents();
    try {
      const item = localStorage.getItem('selected_agent');
      if (item) {
        setSelectedAgent(JSON.parse(item));
      }
    } catch (err) {
      console.warn('Failed to restore selected_agent from localStorage', err);
    }

    // Ensure free tier exists for new users (so they get unlimited chats/images)
    // This runs once on load if a user is authenticated and has no subscription rows.
    (async () => {
      try {
        const userResp = await supabase.auth.getUser();
        const user = (userResp as any)?.data?.user;
        if (user) {
          const { data: subs, error: subsErr } = await (supabase as any)
            .from('user_subscriptions')
            .select('id, status, product_id')
            .eq('user_id', user.id)
            .limit(1);

          if (subsErr) {
            console.warn('Could not check user subscriptions', subsErr);
          }

          if (!subs || subs.length === 0) {
            // grant free tier (server-side upsert-like behavior from client is allowed only if your RLS permits,
            // otherwise move this to a server-side call)
            try {
              await grantFreeTierToUser(user.id);
              console.debug('Granted free tier to user', user.id);
            } catch (err) {
              console.warn('Failed to auto-grant free tier', err);
            }
          }
        }
      } catch (err) {
        console.warn('Could not auto-grant free tier', err);
      }
    })();
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
      setConversations((data as SupabaseConversation[]) || []);

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

  // load published agents (system + user created if published)
  const loadAgents = async () => {
    try {
      const { data, error } = await (supabase as any)
        .from('agents')
        .select('*')
        .eq('is_published', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      // store available published assistants, but do NOT auto-select them
      setAgents(data || []);
      // NOTE: do not auto-set selectedAgent here — let localStorage restore user's last choice,
      // or leave null for the Default assistant.
    } catch (err) {
      console.error('Error loading agents', err);
    }
  };

  const createProject = async (title: string, description?: string): Promise<string | null> => {
    try {
      const userResp = await supabase.auth.getUser();
      const user = (userResp as any)?.data?.user;
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

  const createConversation = async (title?: string, projectId?: string): Promise<string | null> => {
    try {
      const userResp = await supabase.auth.getUser();
      const user = (userResp as any)?.data?.user;
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('conversations')
        .insert({ title, project_id: projectId, user_id: user.id })
        .select()
        .single();

      if (error) throw error;

      const newConv: SupabaseConversation = { ...data, messages: [] };
      setConversations(prev => [newConv, ...prev]);
      setActiveConversation(data.id);
      return data.id;
    } catch (error) {
      console.error('Error creating conversation:', error);
      toast.error('Failed to create conversation');
      return null;
    }
  };

  // Normalize function for duplicate detection
  const normalizeText = (t: string) => {
    if (!t) return '';
    return t
      .replace(/\r\n/g, '\n')
      .replace(/\n+/g, '\n')   // collapse multiple newlines
      .replace(/[ \t]+/g, ' ') // collapse spaces/tabs
      .trim();
  };

  // Defensive helper: collapse exact repeated concatenations (A A ... A)
  const collapseExactDuplicate = (text: string): string => {
    if (!text) return text;
    const normalized = normalizeText(text);
    for (let repeats = 2; repeats <= 4; repeats++) {
      if (normalized.length % repeats !== 0) continue;
      const partLen = Math.floor(normalized.length / repeats);
      const firstPart = normalized.slice(0, partLen);
      let allEqual = true;
      for (let i = 1; i < repeats; i++) {
        const candidate = normalized.slice(i * partLen, (i + 1) * partLen);
        if (candidate !== firstPart) {
          allEqual = false;
          break;
        }
      }
      if (allEqual) {
        return firstPart.trim();
      }
    }

    const parts = text.split(/\n\s*\n/).map(p => normalizeText(p)).filter(Boolean);
    if (parts.length === 2 && parts[0] === parts[1]) {
      return parts[0];
    }

    return text.trim();
  };


  const sendMessage = async (
    content: string,
    modelType: ModelType,
    attachments?: any[],
    withWebSearch: boolean = false
  ): Promise<void> => {
    let conversationId = activeConversation;

    if (!conversationId) {
      conversationId = await createConversation(
        content.slice(0, 50) + (content.length > 50 ? '...' : '')
      );
      if (!conversationId) return;
    }

    setIsLoading(true);

    try {
      // Insert user message
      const { data: userMessage, error: userError } = await supabase
        .from('messages')
        .insert([{
          conversation_id: conversationId,
          role: 'user',
          content,
          message_type: modelType.startsWith('video')
            ? 'video'
            : modelType === 'image'
              ? 'image'
              : modelType === 'code'
                ? 'code'
                : 'text',
          model_type: modelType,
        }])
        .select()
        .single();

      if (userError) throw userError;

      setConversations(prev => prev.map(conv => {
        if (conv.id === conversationId) {
          return {
            ...conv,
            messages: [...(conv.messages || []), userMessage as SupabaseMessage],
          };
        }
        return conv;
      }));

      // Handle file attachments (user)
      if (attachments && attachments.length > 0) {
        const fileMessages = attachments.map(att => ({
          conversation_id: conversationId!,
          role: 'user',
          content: '',
          message_type: 'text',
          model_type: modelType,
          file_name: att.name,
          file_snippet: att.content.substring(0, 200) + (att.content.length > 200 ? '...' : ''),
          attachments: [att],
        }));

        const { data: fileMsgs, error: fileError } = await supabase
          .from('messages')
          .insert(fileMessages)
          .select();

        if (!fileError && fileMsgs) {
          setConversations(prev => prev.map(conv => {
            if (conv.id === conversationId) {
              return {
                ...conv,
                messages: [...(conv.messages || []), ...(fileMsgs as SupabaseMessage[])],
              };
            }
            return conv;
          }));
        }
      }

      // Build context from existing conversation messages
      const { data: messages } = await supabase
        .from('messages')
        .select('role, content')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

      let contextString = '';
      if (attachments && attachments.length > 0) {
        let totalChars = 0;
        const maxChars = 15000;
        for (const att of attachments) {
          if (att.content) {
            let snippet = att.content.slice(0, 5000);
            if (totalChars + snippet.length > maxChars) {
              snippet = snippet.slice(0, maxChars - totalChars);
            }
            contextString += `\n[User Attachment: ${att.name}]\n${snippet}`;
            totalChars += snippet.length;
            if (totalChars >= maxChars) break;
          }
        }
      }

      const messageHistoryBase: OpenRouterMessage[] = (messages?.map(msg => ({
        role: msg.role as 'user' | 'assistant' | 'system',
        content: msg.content,
      })) || []);

      // If selectedAgent is set, prepend its system prompt (server-side enforcement note below)
      const messageHistory: OpenRouterMessage[] = [];

      if (selectedAgent && selectedAgent.persona_json) {
        try {
          const systemPrompt = selectedAgent.persona_json.system_prompt || '';
          const personaInstructions = selectedAgent.persona_json.metadata?.instructions || '';
          const fullSystem = `${systemPrompt}\n\n${personaInstructions}`.trim();
          if (fullSystem) {
            messageHistory.push({ role: 'system', content: fullSystem });
          }
        } catch (err) {
          console.warn('Agent persona_json malformed', err);
        }
      }

      // push previous system messages (if any) and conversation history afterwards
      messageHistory.push(...messageHistoryBase);

      // Merge system prompt parts (docs + web snippets + instructions) into one system message
      let savedSearchResults: any[] = [];
      const systemPromptParts: string[] = [];

      if (contextString) {
        systemPromptParts.push(`The user has uploaded the following document(s). Use them as context:\n${contextString}`);
      }

      if (withWebSearch) {
        try {
          const results = await webSearchSmart(content, 5);
          if (results.length > 0) {
            const sourcesBlock = results.map(r => `[${r.id}] ${r.title}\n${r.snippet}\nURL: ${r.url}`).join('\n\n');
            systemPromptParts.push(`Web snippets:\n\n${sourcesBlock}`);
            savedSearchResults = results.map(r => ({
              id: r.id,
              title: r.title,
              url: r.url,
              snippet: r.snippet,
              meta: r.meta || null,
            }));
          }
        } catch (err) {
          console.error('web search failed', err);
        }
      }

      // If extra system parts exist, prepend them as an additional system message BEFORE user messages
      if (systemPromptParts.length > 0) {
        const merged = systemPromptParts.join('\n\n');
        const instructions = `\n\nInstructions:\n- Answer concisely (3–6 sentences).\n- Use inline citations [1],[2] when referencing snippets.\n- Do not invent facts not present in the snippets. If you cannot verify, say "I couldn't verify this from the provided sources.".\n- End with a Sources: list that maps numbers to URLs.`;
        // prefer placing this system block after agent system prompt but before conversation content
        // insert at index 1 if an agent system prompt exists, else push to front
        if (messageHistory.length > 0 && messageHistory[0].role === 'system') {
          messageHistory.splice(1, 0, { role: 'system', content: `${merged}${instructions}` });
        } else {
          messageHistory.unshift({ role: 'system', content: `${merged}${instructions}` });
        }
      }

      // Call the appropriate model path
      let response: string;
      let images: string[] = [];
      let videos: string[] = [];

      switch (modelType) {
        case 'image':
          try {
            const imageResult = await openRouterService.sendImageMessage(messageHistory);
            response = imageResult.content || 'Image generated successfully!';
            images = imageResult.images;
          } catch (err: any) {
            response = `Image generation failed: ${err.message}`;
          }
          break;

        case 'code':
          try {
            response = await openRouterService.sendCodeMessage(messageHistory);
          } catch (err: any) {
            if (err.message.includes('429')) {
              throw new Error('Code model is temporarily rate-limited. Please try again later or use the Chat model for code questions.');
            }
            throw err;
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
          } catch (err: any) {
            response = `Video generation failed: ${err.message}`;
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
          } catch (err: any) {
            response = `Video generation failed: ${err.message}`;
          }
          break;

        case 'analyzer':
          try {
            const analyzerPrompt: OpenRouterMessage[] = [
              {
                role: 'system',
                content: `You are an Analyzer. 
Perform the following tasks on the given input:
1. Sentiment (Positive/Negative/Neutral).
2. Summary (2-3 lines).
3. If text is code, highlight potential bugs, risks, or improvements.`
              },
              { role: 'user', content }
            ];
            response = await openRouterService.sendChatMessage(analyzerPrompt);
          } catch (err: any) {
            response = `Analyzer failed: ${err.message}`;
          }
          break;

        default:
          response = await openRouterService.sendChatMessage(messageHistory);
      }

      // ---- NEW: collapse exact duplicates (defensive)
      response = collapseExactDuplicate(response);

      // ---- NEW: Defensive DB duplicate-check:
      let assistantMessage: any = null;
      try {
        const { data: lastMsgs, error: lastErr } = await supabase
          .from('messages')
          .select('id, role, content, created_at, attachments, images, videos, model_type, message_type')
          .eq('conversation_id', conversationId)
          .order('created_at', { ascending: false })
          .limit(1);

        if (lastErr) {
          console.warn('Failed to fetch last message for duplicate-check', lastErr);
        }

        const normalizedResponse = normalizeText(response || '');
        const last = Array.isArray(lastMsgs) && lastMsgs.length > 0 ? lastMsgs[0] : null;
        if (last && last.role === 'assistant' && normalizeText(last.content || '') === normalizedResponse) {
          assistantMessage = last;
          console.debug('[useSupabaseChat] skipping assistant insert - same as last assistant message');
        }
      } catch (err) {
        console.error('Error checking last message before insert', err);
      }

      // If assistantMessage is still null, insert a new assistant row (include agent_id if set)
      if (!assistantMessage) {
        const { data: insertedAssistant, error: assistantError } = await supabase
          .from('messages')
          .insert([{
            conversation_id: conversationId,
            role: 'assistant',
            content: response,
            message_type: modelType.startsWith('video')
              ? 'video'
              : modelType === 'image'
                ? 'image'
                : modelType === 'code'
                  ? 'code'
                  : 'text',
            model_type: modelType,
            agent_id: selectedAgent?.id ?? null,
            images: images ?? [],
            videos: videos ?? [],
          }])
          .select()
          .single();

        if (assistantError) throw assistantError;
        assistantMessage = insertedAssistant;
      }

      // Attach search results to assistant message (if present)
      if (assistantMessage && savedSearchResults.length > 0) {
        try {
          const { data: updated, error: updateErr } = await supabase
            .from('messages')
            .update({ attachments: savedSearchResults })
            .eq('id', assistantMessage.id)
            .select()
            .single();

          if (!updateErr && updated) {
            setConversations(prev => prev.map(conv => {
              if (conv.id === conversationId) {
                return {
                  ...conv,
                  messages: [...(conv.messages || []), updated as SupabaseMessage],
                };
              }
              return conv;
            }));
          } else {
            console.warn('Failed to attach search results to assistant message', updateErr);
            setConversations(prev => prev.map(conv => {
              if (conv.id === conversationId) {
                return {
                  ...conv,
                  messages: [...(conv.messages || []), assistantMessage as SupabaseMessage],
                };
              }
              return conv;
            }));
          }
        } catch (err) {
          console.error('Error updating assistant message with attachments', err);
          setConversations(prev => prev.map(conv => {
            if (conv.id === conversationId) {
              return {
                ...conv,
                messages: [...(conv.messages || []), assistantMessage as SupabaseMessage],
              };
            }
            return conv;
          }));
        }
      } else {
        // append assistantMessage (either newly inserted or reused existing) if not already appended
        setConversations(prev => prev.map(conv => {
          if (conv.id === conversationId) {
            return {
              ...conv,
              messages: [...(conv.messages || []), assistantMessage as SupabaseMessage],
            };
          }
          return conv;
        }));
      }

    } catch (err) {
      console.error('Error sending message:', err);
      toast.error('Failed to send message. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const searchMessages = async (query: string) => {
    try {
      const { data, error } = await supabase
        .from('messages')
        .select(`
          id,
          content,
          conversation_id,
          conversations ( id, title )
        `)
        .ilike('content', `%${query}%`)
        .limit(20);

      if (error) throw error;
      return data;
    } catch (err) {
      console.error('Error searching messages:', err);
      return [];
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

  const updateConversationProject = async (conversationId: string, projectId: string | null) => {
    try {
      const { error } = await supabase
        .from('conversations')
        .update({ project_id: projectId })
        .eq('id', conversationId);

      if (error) throw error;
      await loadConversations();
      toast.success(projectId ? 'Chat assigned to project' : 'Chat removed from project');
    } catch (err) {
      toast.error('Failed to update chat project');
      console.error('Error updating conversation project:', err);
    }
  };

  const deleteProject = async (projectId: string) => {
    try {
      const { error: updErr } = await supabase
        .from('conversations')
        .update({ project_id: null })
        .eq('project_id', projectId);
      if (updErr) throw updErr;

      const { error: delErr } = await supabase
        .from('projects')
        .delete()
        .eq('id', projectId);
      if (delErr) throw delErr;

      setProjects(prev => prev.filter(p => p.id !== projectId));
      setConversations(prev => prev.map(c => c.project_id === projectId ? { ...c, project_id: null } : c));
      toast.success('Project deleted');
    } catch (err) {
      console.error('Error deleting project:', err);
      toast.error('Failed to delete project');
    }
  };

  return {
    conversations,
    projects,
    agents,
    selectedAgent,
    setSelectedAgent,
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
    loadAgents,
    searchMessages,
    updateConversationProject,
    deleteProject,
  };
};
