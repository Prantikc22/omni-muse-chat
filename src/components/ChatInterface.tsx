import { useChat } from '@/hooks/useChat';
import { ChatSidebar } from './ChatSidebar';
import { ChatMessage } from './ChatMessage';
import { ChatInput } from './ChatInput';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useEffect, useRef } from 'react';

export const ChatInterface = () => {
  const {
    conversations,
    activeConversation,
    setActiveConversation,
    getCurrentConversation,
    createConversation,
    sendMessage,
    deleteConversation,
    isLoading,
  } = useChat();

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const currentConversation = getCurrentConversation();

  // Auto-scroll to bottom when new messages are added
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [currentConversation?.messages]);

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <ChatSidebar
        conversations={conversations}
        activeConversation={activeConversation}
        onSelectConversation={setActiveConversation}
        onCreateConversation={() => createConversation()}
        onDeleteConversation={deleteConversation}
      />

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Messages */}
        <ScrollArea className="flex-1">
          <div className="max-w-4xl mx-auto">
            {currentConversation?.messages.length === 0 ? (
              <div className="flex items-center justify-center h-full min-h-[400px]">
                <div className="text-center space-y-4">
                  <div className="text-6xl">💬</div>
                  <h2 className="text-2xl font-semibold">Ready to Chat</h2>
                  <p className="text-muted-foreground max-w-md">
                    Choose a model and start a conversation. I can help with general chat, 
                    code generation, and image analysis.
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-0">
                {currentConversation?.messages.map((message) => (
                  <ChatMessage key={message.id} message={message} />
                ))}
                {isLoading && (
                  <div className="flex gap-3 p-4">
                    <div className="w-8 h-8 rounded-full bg-chat-assistant flex items-center justify-center">
                      <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                    </div>
                    <div className="text-muted-foreground">Thinking...</div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Input */}
        <ChatInput onSendMessage={sendMessage} isLoading={isLoading} />
      </div>
    </div>
  );
};