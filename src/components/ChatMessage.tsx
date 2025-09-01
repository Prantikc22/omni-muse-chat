import { Message } from '@/types/chat';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Copy, User, Bot } from 'lucide-react';
import { toast } from 'sonner';
import { useEffect, useRef } from 'react';
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

  const formatContent = (content: string) => {
    // Check if content contains code blocks
    const codeBlockRegex = /```(\w+)?\n?([\s\S]*?)```/g;
    const parts = [];
    let lastIndex = 0;
    let match;

    while ((match = codeBlockRegex.exec(content)) !== null) {
      // Add text before code block
      if (match.index > lastIndex) {
        parts.push({
          type: 'text',
          content: content.slice(lastIndex, match.index),
        });
      }

      // Add code block
      parts.push({
        type: 'code',
        language: match[1] || 'plaintext',
        content: match[2].trim(),
      });

      lastIndex = match.index + match[0].length;
    }

    // Add remaining text
    if (lastIndex < content.length) {
      parts.push({
        type: 'text',
        content: content.slice(lastIndex),
      });
    }

    return parts.length > 0 ? parts : [{ type: 'text', content }];
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
        <div className={`inline-block rounded-lg px-4 py-2 ${
          isUser 
            ? 'bg-chat-user text-primary-foreground ml-auto' 
            : 'bg-chat-assistant text-foreground'
        }`}>
          {formatContent(message.content).map((part, index) => {
            if (part.type === 'code') {
              return (
                <div key={index} className="relative my-2">
                  <div className="flex items-center justify-between bg-muted rounded-t-md px-3 py-2 text-xs text-muted-foreground">
                    <span>{part.language}</span>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-auto p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => copyToClipboard(part.content)}
                    >
                      <Copy className="w-3 h-3" />
                    </Button>
                  </div>
                  <pre className="bg-muted rounded-b-md p-3 overflow-x-auto">
                    <code className={`language-${part.language}`}>
                      {part.content}
                    </code>
                  </pre>
                </div>
              );
            }
            
            return (
              <div key={index} className="whitespace-pre-wrap">
                {part.content}
              </div>
            );
          })}
        </div>
        
        <div className={`text-xs text-muted-foreground mt-1 ${isUser ? 'text-right' : ''}`}>
          {message.timestamp.toLocaleTimeString()} • {message.model}
        </div>
      </div>
    </div>
  );
};