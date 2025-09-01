import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Send, Loader2 } from 'lucide-react';
import { ModelType } from '@/types/chat';

interface ChatInputProps {
  onSendMessage: (content: string, modelType: ModelType) => void;
  isLoading: boolean;
}

export const ChatInput = ({ onSendMessage, isLoading }: ChatInputProps) => {
  const [message, setMessage] = useState('');
  const [modelType, setModelType] = useState<ModelType>('chat');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim() && !isLoading) {
      onSendMessage(message.trim(), modelType);
      setMessage('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const modelOptions = [
    { value: 'chat' as ModelType, label: 'Chat', description: 'DeepSeek Chat v3.1' },
    { value: 'code' as ModelType, label: 'Code', description: 'Qwen3 Coder' },
    { value: 'image' as ModelType, label: 'Image', description: 'Gemini 2.5 Flash Image' },
  ];

  return (
    <div className="border-t border-border bg-background p-4">
      <form onSubmit={handleSubmit} className="max-w-4xl mx-auto space-y-3">
        {/* Model Selection */}
        <div className="flex items-center gap-2">
          <Select value={modelType} onValueChange={(value) => setModelType(value as ModelType)}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {modelOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  <div>
                    <div className="font-medium">{option.label}</div>
                    <div className="text-xs text-muted-foreground">{option.description}</div>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Message Input */}
        <div className="flex items-end gap-3">
          <div className="flex-1">
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={`Message ${modelOptions.find(opt => opt.value === modelType)?.label}...`}
              className="resize-none min-h-[60px] max-h-[200px]"
              rows={3}
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
        </div>
      </form>
    </div>
  );
};