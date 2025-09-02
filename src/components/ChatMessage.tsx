import { Message } from '@/types/chat';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Copy, User, Bot } from 'lucide-react';
import { toast } from 'sonner';
import { useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import Prism from 'prismjs';
import 'prismjs/themes/prism-dark.css';
import 'prismjs/components/prism-javascript';
import 'prismjs/components/prism-typescript';
import 'prismjs/components/prism-python';
import 'prismjs/components/prism-jsx';
import 'prismjs/components/prism-tsx';
import 'prismjs/components/prism-css';
import 'prismjs/components/prism-json';

interface ChatMessageProps {
  message: Message;
}

export const ChatMessage = ({ message }: ChatMessageProps) => {
  const messageRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (messageRef.current) {
      Prism.highlightAllUnder(messageRef.current);
    }
  }, [message.content]);

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success('Copied to clipboard!');
    } catch (error) {
      toast.error('Failed to copy');
    }
  };

  const isUser = message.role === 'user';

  return (
    <div className={`flex gap-3 p-4 group ${isUser ? 'flex-row-reverse' : ''}`}>
      <Avatar className="w-8 h-8 flex-shrink-0">
        <AvatarFallback className={isUser ? 'bg-chat-user text-primary-foreground' : 'bg-chat-assistant'}>
          {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
        </AvatarFallback>
      </Avatar>
      
      <div 
        ref={messageRef}
        className={`flex-1 max-w-3xl ${isUser ? 'text-right' : ''}`}
      >
        <div className={`relative group/message inline-block rounded-lg px-4 py-2 ${
          isUser 
            ? 'bg-chat-user text-primary-foreground ml-auto' 
            : 'bg-chat-assistant text-foreground'
        }`}>
          {!isUser && (
            <Button
              size="sm"
              variant="ghost"
              className="absolute top-2 right-2 h-auto p-1 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={() => copyToClipboard(message.content)}
            >
              <Copy className="w-3 h-3" />
            </Button>
          )}

          {/* Render images if available */}
          {message.images && message.images.length > 0 && (
            <div className="mb-3 space-y-2">
              {message.images.map((imageUrl, index) => (
                <img
                  key={index}
                  src={imageUrl}
                  alt={`Generated image ${index + 1}`}
                  className="max-w-full h-auto rounded-lg border border-border"
                />
              ))}
            </div>
          )}

          {/* Render videos if available */}
          {message.videos && message.videos.length > 0 && (
            <div className="mb-3 space-y-2">
              {message.videos.map((videoUrl, index) => (
                <video
                  key={index}
                  src={videoUrl}
                  controls
                  className="max-w-full h-auto rounded-lg border border-border"
                  style={{ maxHeight: '400px' }}
                >
                  Your browser does not support the video tag.
                </video>
              ))}
            </div>
          )}

          {/* Render content */}
          {isUser ? (
            <div className="whitespace-pre-wrap">{message.content}</div>
          ) : (
            <div className="prose prose-invert max-w-none">
              <ReactMarkdown
                components={{
                  code: ({ className, children, ...props }) => {
                    const match = /language-(\w+)/.exec(className || '');
                    const language = match ? match[1] : '';
                    const isInline = !className;
                    
                    if (isInline) {
                      return (
                        <code className="bg-muted px-1 py-0.5 rounded text-sm font-mono" {...props}>
                          {children}
                        </code>
                      );
                    }

                    return (
                      <div className="relative my-2">
                        <div className="flex items-center justify-between bg-muted rounded-t-md px-3 py-2 text-xs text-muted-foreground">
                          <span>{language || 'plaintext'}</span>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-auto p-1"
                            onClick={() => copyToClipboard(String(children))}
                          >
                            <Copy className="w-3 h-3" />
                          </Button>
                        </div>
                        <pre className="bg-muted rounded-b-md p-3 overflow-x-auto">
                          <code className={`language-${language}`} {...props}>
                            {children}
                          </code>
                        </pre>
                      </div>
                    );
                  },
                  p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                  ul: ({ children }) => <ul className="list-disc list-inside mb-2 space-y-1">{children}</ul>,
                  ol: ({ children }) => <ol className="list-decimal list-inside mb-2 space-y-1">{children}</ol>,
                  h1: ({ children }) => <h1 className="text-xl font-bold mb-2">{children}</h1>,
                  h2: ({ children }) => <h2 className="text-lg font-semibold mb-2">{children}</h2>,
                  h3: ({ children }) => <h3 className="text-base font-medium mb-2">{children}</h3>,
                }}
              >
                {message.content}
              </ReactMarkdown>
            </div>
          )}
        </div>
        
        <div className={`text-xs text-muted-foreground mt-1 ${isUser ? 'text-right' : ''}`}>
          {message.timestamp.toLocaleTimeString()} • {message.model}
        </div>
      </div>
    </div>
  );
};