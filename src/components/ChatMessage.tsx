// src/components/ChatMessage.tsx
import { Message } from '@/types/chat';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Copy, User, Bot, MoreVertical, Search, Trash, Volume2 } from 'lucide-react';
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
import { ChartRenderer } from "@/components/ChartRenderer";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface ChatMessageProps {
  message: Message;
  onAnalyze?: (content: string) => void;
  onDelete?: (id: string) => void;
}

export const ChatMessage = ({ message, onAnalyze, onDelete }: ChatMessageProps) => {
  const messageRef = useRef<HTMLDivElement>(null);

  // Highlight code blocks on content change
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

  // *** VOICE: Text-to-Speech helper ***
  const speakText = (text: string) => {
    if (!text || typeof window === 'undefined' || !('speechSynthesis' in window)) {
      toast.error('TTS not supported in this browser.');
      return;
    }
    try {
      window.speechSynthesis.cancel();
      const ut = new SpeechSynthesisUtterance(text);
      ut.rate = 1.0;
      ut.pitch = 1.0;
      const voices = window.speechSynthesis.getVoices();
      if (voices && voices.length) {
        ut.voice = voices.find(v => v.lang?.startsWith('en')) || voices[0];
      }
      window.speechSynthesis.speak(ut);
    } catch (err) {
      console.error('TTS error', err);
      toast.error('TTS failed');
    }
  };

  // Chart normalization: accept either Recharts-like or Chart.js-like payloads
  const normalizeChartJson = (json: any) => {
    if (!json) return null;

    // Already Recharts style
    if (json.chart && Array.isArray(json.data)) {
      return json;
    }

    // Chart.js style -> convert to simple { chart, data: [{label, value}, ...] }
    if (json.type && json.data && Array.isArray(json.data.labels) && Array.isArray(json.data.datasets)) {
      const labels = json.data.labels;
      const dataset = json.data.datasets[0];
      return {
        chart: json.type,
        data: labels.map((label: string, i: number) => ({
          label,
          value: dataset.data[i],
        })),
      };
    }

    return null;
  };

  // Try parse JSON block or raw JSON message
  const extractJsonFromContent = (text: string) => {
    if (!text) return null;
    try {
      const match = text.match(/```json([\s\S]*?)```/);
      if (match) {
        return JSON.parse(match[1].trim());
      }
      const trimmed = text.trim();
      if ((trimmed.startsWith('{') && trimmed.endsWith('}')) || (trimmed.startsWith('[') && trimmed.endsWith(']'))) {
        return JSON.parse(trimmed);
      }
      return null;
    } catch (err) {
      return null;
    }
  };

  // Render content
  const renderContent = () => {
    if (message.fileName) {
      return null; // file UI rendered elsewhere
    }

    if (isUser) {
      return <div className="whitespace-pre-wrap">{message.content}</div>;
    }

    const json = extractJsonFromContent(message.content);
    const normalized = json ? normalizeChartJson(json) : null;

    if (normalized) {
      return (
        <>
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
                      <pre
                        style={{
                          background: '#23272e',
                          borderRadius: '0 0 0.5rem 0.5rem',
                          padding: '1rem',
                          overflowX: 'auto',
                          border: '1px solid #363b42',
                        }}
                      >
                        <code
                          className={`language-${language}`}
                          style={{ color: '#f8f8f2', background: 'none', fontSize: '1rem' }}
                          {...props}
                        >
                          {children}
                        </code>
                      </pre>
                    </div>
                  );
                },
              }}
            >
              {message.content}
            </ReactMarkdown>
          </div>

          <div className="mt-4 border border-border rounded-lg p-3 bg-card">
            <ChartRenderer data={normalized} />
          </div>
        </>
      );
    }

    return (
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
                  <pre
                    style={{
                      background: '#23272e',
                      borderRadius: '0 0 0.5rem 0.5rem',
                      padding: '1rem',
                      overflowX: 'auto',
                      border: '1px solid #363b42',
                    }}
                  >
                    <code
                      className={`language-${language}`}
                      style={{ color: '#f8f8f2', background: 'none', fontSize: '1rem' }}
                      {...props}
                    >
                      {children}
                    </code>
                  </pre>
                </div>
              );
            },
          }}
        >
          {message.content}
        </ReactMarkdown>
      </div>
    );
  };

  return (
    <div className={`flex gap-3 p-4 group ${isUser ? 'flex-row-reverse' : ''}`}>
      <Avatar className="w-8 h-8 flex-shrink-0">
        <AvatarFallback className={isUser ? 'bg-chat-user text-primary-foreground' : 'bg-chat-assistant'}>
          {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
        </AvatarFallback>
      </Avatar>

      <div ref={messageRef} className={`flex-1 max-w-3xl ${isUser ? 'text-right' : ''}`}>
        <div
          className={`relative group/message inline-block rounded-lg px-4 py-2 ${
            isUser ? 'bg-chat-user text-primary-foreground ml-auto' : 'bg-chat-assistant text-foreground'
          }`}
        >
          {/* ⋮ Actions menu for assistant messages */}
          {!isUser && (
            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button size="icon" variant="ghost" className="h-6 w-6 p-0">
                    <MoreVertical className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => copyToClipboard(message.content)}>
                    <Copy className="w-3 h-3 mr-2" /> Copy
                  </DropdownMenuItem>

                  {/* *** VOICE: Listen (TTS) */}
                  <DropdownMenuItem onClick={() => speakText(message.content)}>
                    <Volume2 className="w-3 h-3 mr-2" /> Listen
                  </DropdownMenuItem>

                  {onAnalyze && (
                    <DropdownMenuItem onClick={() => onAnalyze(message.content)}>
                      <Search className="w-3 h-3 mr-2" /> Analyze
                    </DropdownMenuItem>
                  )}
                  {onDelete && (
                    <DropdownMenuItem onClick={() => onDelete(message.id)}>
                      <Trash className="w-3 h-3 mr-2 text-red-500" /> Delete
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
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

          {/* File attachment preview */}
          {message.fileName ? (
            <div className="flex items-center gap-2 p-3 bg-muted rounded mb-2 border border-border">
              <svg width="24" height="24" fill="none" viewBox="0 0 24 24">
                <rect width="18" height="22" x="3" y="1" fill="#64748b" rx="2" />
                <rect width="14" height="2" x="5" y="4" fill="#e2e8f0" />
                <rect width="14" height="2" x="5" y="8" fill="#e2e8f0" />
                <rect width="10" height="2" x="5" y="12" fill="#e2e8f0" />
              </svg>
              <div>
                <div className="font-medium">{message.fileName}</div>
                {message.fileSnippet && (
                  <div className="text-xs text-muted-foreground mt-1 max-w-xs truncate">{message.fileSnippet}</div>
                )}
                <div className="text-xs text-muted-foreground mt-1">Document uploaded and sent as context.</div>
              </div>
            </div>
          ) : (
            // Render content (user or assistant) exactly once
            renderContent()
          )}
        </div>

        <div className={`text-xs text-muted-foreground mt-1 ${isUser ? 'text-right' : ''}`}>
          {message.timestamp.toLocaleTimeString()} • {message.model}
        </div>
      </div>
    </div>
  );
};
