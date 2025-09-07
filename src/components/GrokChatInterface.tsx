// src/components/GrokChatInterface.tsx
import { useState, useRef, useEffect } from 'react';
import { Send, Paperclip, Loader2, Globe, Mic, MicOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useSupabaseChat, ModelType } from '@/hooks/useSupabaseChat';
import { ChatMessage } from '@/components/ChatMessage';
import * as pdfjsLib from "pdfjs-dist";
import { GlobalWorkerOptions } from "pdfjs-dist";
import Papa from "papaparse";
import * as XLSX from "xlsx";
import * as mammoth from "mammoth";
import TopBar from "@/components/TopBar";
import { BuildAgentModal } from "@/components/BuildAgentModal"; // business modal (kept)
import { AgentCreateModal } from '@/components/AgentCreateModal'; // lightweight modal for normal users
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

// Tell pdf.js where to load the worker
GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.js`;

interface GrokChatInterfaceProps {
  conversationId?: string;
  selectedModel: ModelType;
}

export const GrokChatInterface = ({ conversationId, selectedModel }: GrokChatInterfaceProps) => {
  // Detect read-only mode from URL (?view or ?readonly)
  const isReadOnly = typeof window !== 'undefined' &&
    (window.location.search.includes('readonly') || window.location.search.includes('view'));

  // Local state for read-only messages
  const [readonlyMessages, setReadonlyMessages] = useState<any[]>([]);
  const [readonlyLoading, setReadonlyLoading] = useState(false);

  useEffect(() => {
    if (isReadOnly && conversationId) {
      setReadonlyLoading(true);
      // fetch messages for this conversationId
      import('@/integrations/supabase/client').then(({ supabase }) => {
        supabase
          .from('messages')
          .select('*')
          .eq('conversation_id', conversationId)
          .order('created_at', { ascending: true })
          .then(({ data }) => {
            setReadonlyMessages(data || []);
            setReadonlyLoading(false);
          });
      });
    }
  }, [isReadOnly, conversationId]);
  
  const [message, setMessage] = useState('');
  const [attachments, setAttachments] = useState<File[]>([]);
  const [useWebSearch, setUseWebSearch] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // modals
  const [agentCreateOpen, setAgentCreateOpen] = useState(false);
  const [buildAgentOpen, setBuildAgentOpen] = useState(false); // BuildAgentModal controlled by TopBar

  // *** VOICE (STT) state ***
  const [isRecording, setIsRecording] = useState(false);
  const recognitionRef = useRef<any>(null);

  const navigate = useNavigate();

  const { 
    getCurrentConversation, 
    sendMessage, 
    isLoading,
    setActiveConversation,
    agents,
    selectedAgent,
    setSelectedAgent,
    loadAgents, // used to refresh after creation
  } = useSupabaseChat();

  const currentConversation = getCurrentConversation();

  // Restore active conversation if a conversationId prop is passed
  useEffect(() => {
    if (conversationId) {
      setActiveConversation(conversationId);
    }
  }, [conversationId, setActiveConversation]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [currentConversation?.messages, isLoading]);

  // Listen for a global event to open lightweight agent create modal
  useEffect(() => {
    const handler = () => setAgentCreateOpen(true);
    window.addEventListener('openAgentCreate', handler as EventListener);
    return () => window.removeEventListener('openAgentCreate', handler as EventListener);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || isLoading || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const messageContent = message;
      setMessage('');

      const parsedAttachments = await Promise.all(
        attachments.map(async (file) => {
          let text = '';

          if (file.type === 'application/pdf') {
            const pdf = await pdfjsLib.getDocument({ data: await file.arrayBuffer() }).promise;
            for (let i = 1; i <= pdf.numPages; i++) {
              const page = await pdf.getPage(i);
              const content = await page.getTextContent();
              text += content.items.map((item: any) => item.str).join(" ") + "\n";
            }
          } else if (file.name.endsWith('.csv')) {
            const rawText = await file.text();
            const parsed = Papa.parse(rawText, { header: true });
            text = JSON.stringify(parsed.data.slice(0, 20));
          } else if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
            const workbook = XLSX.read(await file.arrayBuffer(), { type: "array" });
            const firstSheet = workbook.SheetNames[0];
            const sheetData = XLSX.utils.sheet_to_json(workbook.Sheets[firstSheet]);
            text = JSON.stringify(sheetData.slice(0, 20));
          } else if (file.name.endsWith('.docx')) {
            const arrayBuffer = await file.arrayBuffer();
            const { value } = await mammoth.extractRawText({ arrayBuffer });
            text = value;
          } else {
            text = await file.text();
          }

          return {
            name: file.name,
            type: file.type,
            content: text,
          };
        })
      );

      await sendMessage(messageContent, selectedModel, parsedAttachments, useWebSearch);
      setAttachments([]);
      setUseWebSearch(false);
    } catch (err) {
      console.error('handleSubmit error', err);
      toast.error('Send failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (!isSubmitting && !isLoading) handleSubmit(e);
    }
  };

  const handleFileAttach = () => fileInputRef.current?.click();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setAttachments(prev => [...prev, ...Array.from(e.target.files)]);
    }
  };

  // *** VOICE: init recognition lazily ***
  const initRecognition = () => {
    if (recognitionRef.current) return recognitionRef.current;
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      toast.error('Speech recognition not supported in this browser.');
      return null;
    }
    const rec: any = new SpeechRecognition();
    rec.lang = 'en-US';
    rec.interimResults = false;
    rec.maxAlternatives = 1;

    rec.onstart = () => setIsRecording(true);
    rec.onend = () => setIsRecording(false);
    rec.onerror = (e: any) => {
      console.error('STT error', e);
      setIsRecording(false);
      toast.error('Voice recognition error.');
    };
    rec.onresult = (ev: any) => {
      const transcript = Array.from(ev.results).map((r: any) => r[0].transcript).join('');
      setMessage(prev => (prev ? prev + ' ' + transcript : transcript));
    };

    recognitionRef.current = rec;
    return rec;
  };

  const toggleRecording = () => {
    const rec = initRecognition();
    if (!rec) return;
    try {
      if (isRecording) {
        rec.stop();
      } else {
        rec.start();
      }
    } catch (err) {
      console.error('toggleRecording error', err);
      toast.error('Microphone error');
      setIsRecording(false);
    }
  };

  const messages = isReadOnly ? readonlyMessages : (currentConversation?.messages || []);

  // how many assistant chips to show inline (small, to avoid clutter)
  const MAX_INLINE_ASSISTANTS = 4;

  return (
    <div className="flex flex-col h-full bg-background">
      {/* TopBar: pass an opener for the business BuildAgent modal */}
      <TopBar onOpenBuildAgent={() => setBuildAgentOpen(true)} />

      {/* Chat area */}
      <div className="flex-1 flex flex-col">
        <ScrollArea className="flex-1 px-6 py-4">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-gradient-primary flex items-center justify-center">
                <span className="text-white font-bold text-2xl">L</span>
              </div>
              <div>
                <h2 className="text-2xl font-semibold mb-2">What can I help you with?</h2>
                <p className="text-muted-foreground">
                  I can help you with {selectedModel === 'image' ? 'image generation' : 
                  selectedModel === 'code' ? 'coding and programming' :
                  selectedModel.startsWith('video') ? 'video generation' : 'general questions and conversations'}.
                </p>
              </div>
            </div>
          ) : (
            <div className="max-w-4xl mx-auto space-y-6">
              {messages.map((msg) => (
                <ChatMessage
                  key={msg.id}
                  message={{
                    id: msg.id,
                    content: msg.content,
                    role: msg.role,
                    timestamp: new Date(msg.created_at),
                    type: msg.message_type,
                    model: msg.model_type as ModelType,
                    images: msg.images || [],
                    videos: msg.videos || [],
                    fileName: msg.file_name,
                    fileSnippet: msg.file_snippet,
                  }}
                  onAnalyze={(content) => sendMessage(content, 'analyzer')}
                />
              ))}
              {isLoading && (
                <div className="flex items-center justify-center py-8">
                  <div className="flex items-center space-x-2 text-muted-foreground">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Thinking...</span>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </ScrollArea>

        {/* Input Area */}
        <div className="border-t border-border bg-card p-6">
          <div className="max-w-4xl mx-auto">


            {attachments.length > 0 && (
              <div className="mb-4 flex flex-wrap gap-2">
                {attachments.map((file, index) => (
                  <div key={index} className="bg-muted rounded px-2 py-1 text-sm">
                    {file.name}
                  </div>
                ))}
              </div>
            )}
            
            {isReadOnly && (
              <div className="mb-2 text-xs text-yellow-700 bg-yellow-100 rounded px-2 py-1 border border-yellow-300">
                This is a read-only shared chat. You can't send new messages.
              </div>
            )}
            <form onSubmit={handleSubmit} className="flex items-end gap-3 relative">
              <div className="flex-1 relative">
                <Textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={`Message Orbis (${selectedModel})...`}
                  className="resize-none min-h-[60px] max-h-[200px] pr-28 bg-background"
                  rows={3}
                  disabled={isReadOnly}
                />
                {/* 📎 File attach */}
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  onClick={handleFileAttach}
                  className="absolute right-20 bottom-2 h-8 w-8"
                  disabled={isReadOnly}
                >
                  <Paperclip className="w-4 h-4" />
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  className="hidden"
                  onChange={handleFileChange}
                  accept="image/*,.pdf,.txt,.docx,.csv,.xlsx,.xls"
                  disabled={isReadOnly}
                />
                {/* 🌐 Web Search toggle */}
                <Button
                  type="button"
                  size="icon"
                  variant={useWebSearch ? "default" : "ghost"}
                  onClick={() => setUseWebSearch(!useWebSearch)}
                  className="absolute right-12 bottom-2 h-8 w-8"
                  title="Use web search"
                  disabled={isReadOnly}
                >
                  <Globe className="w-4 h-4" />
                </Button>

                {/* *** VOICE: Mic button (STT) *** */}
                <Button
                  type="button"
                  size="icon"
                  variant={isRecording ? "default" : "ghost"}
                  onClick={toggleRecording}
                  className="absolute right-2 bottom-2 h-8 w-8"
                  title={isRecording ? "Stop recording" : "Start recording"}
                  disabled={isReadOnly}
                >
                  {isRecording ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
                </Button>
              </div>
              
              <Button
                type="submit"
                size="icon"
                disabled={isReadOnly || !message.trim() || isLoading || isSubmitting}
                className="h-[60px] w-[60px] bg-gradient-primary hover:opacity-90 transition-opacity shrink-0"
              >
                {(isLoading || isSubmitting) ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Send className="w-5 h-5" />
                )}
              </Button>
            </form>
            
            <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
              <span>Use Shift + Enter for new line</span>
              <span>Model: {selectedModel} {useWebSearch && "🌐"}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Agent create modal (separate from your BuildAgentModal) */}
      <AgentCreateModal
        open={agentCreateOpen}
        onClose={() => setAgentCreateOpen(false)}
        onCreated={async (agent) => {
          // refresh published agents and optionally select it
          try {
            await loadAgents?.();
            // keep behavior: optionally auto-select newly created agent for convenience
            setSelectedAgent(agent);
          } catch (err) {
            console.warn('Could not refresh agents after create', err);
          }
        }}
      />

<BuildAgentModal
  open={buildAgentOpen}
  onClose={() => setBuildAgentOpen(false)}
/>
    </div>
  );
};

export default GrokChatInterface;
