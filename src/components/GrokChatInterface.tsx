import { useState, useRef, useEffect } from 'react';
import { Send, Paperclip, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useSupabaseChat, ModelType } from '@/hooks/useSupabaseChat';
import { ChatMessage } from '@/components/ChatMessage';

interface GrokChatInterfaceProps {
  conversationId?: string;
  selectedModel: ModelType;
}

export const GrokChatInterface = ({ conversationId, selectedModel }: GrokChatInterfaceProps) => {
  const [message, setMessage] = useState('');
  const [attachments, setAttachments] = useState<File[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const { 
    getCurrentConversation, 
    sendMessage, 
    isLoading,
    setActiveConversation
  } = useSupabaseChat();

  const currentConversation = getCurrentConversation();

  useEffect(() => {
    if (conversationId) {
      setActiveConversation(conversationId);
    }
  }, [conversationId, setActiveConversation]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [currentConversation?.messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || isLoading) return;

    const messageContent = message;
    setMessage('');
    
    await sendMessage(messageContent, selectedModel, attachments);
    setAttachments([]);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleFileAttach = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setAttachments(Array.from(e.target.files));
    }
  };

  const messages = currentConversation?.messages || [];

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Messages */}
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
                  }}
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
            
            <form onSubmit={handleSubmit} className="flex items-end gap-3">
              <div className="flex-1 relative">
                <Textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={`Message Logicwerk Labs (${selectedModel})...`}
                  className="resize-none min-h-[60px] max-h-[200px] pr-12 bg-background"
                  rows={3}
                />
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  onClick={handleFileAttach}
                  className="absolute right-2 bottom-2 h-8 w-8"
                >
                  <Paperclip className="w-4 h-4" />
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  className="hidden"
                  onChange={handleFileChange}
                  accept="image/*,.pdf,.txt,.doc,.docx"
                />
              </div>
              
              <Button
                type="submit"
                size="icon"
                disabled={!message.trim() || isLoading}
                className="h-[60px] w-[60px] bg-gradient-primary hover:opacity-90 transition-opacity shrink-0"
              >
                {isLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Send className="w-5 h-5" />
                )}
              </Button>
            </form>
            
            <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
              <span>Use Shift + Enter for new line</span>
              <span>Model: {selectedModel}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};