import { Conversation } from '@/types/chat';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Plus, MessageSquare, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ChatSidebarProps {
  conversations: Conversation[];
  activeConversation: string | null;
  onSelectConversation: (id: string) => void;
  onCreateConversation: () => void;
  onDeleteConversation: (id: string) => void;
}

export const ChatSidebar = ({
  conversations,
  activeConversation,
  onSelectConversation,
  onCreateConversation,
  onDeleteConversation,
}: ChatSidebarProps) => {
  return (
    <div className="w-64 bg-card border-r border-border flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-border">
        <Button 
          onClick={onCreateConversation}
          className="w-full bg-gradient-primary hover:opacity-90 transition-opacity"
          size="sm"
        >
          <Plus className="w-4 h-4 mr-2" />
          New Chat
        </Button>
      </div>

      {/* Conversations List */}
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1">
          {conversations.map((conversation) => (
            <div
              key={conversation.id}
              className={cn(
                "group flex items-center gap-2 rounded-md p-2 text-sm cursor-pointer hover:bg-chat-hover transition-colors",
                activeConversation === conversation.id && "bg-accent"
              )}
              onClick={() => onSelectConversation(conversation.id)}
            >
              <MessageSquare className="w-4 h-4 flex-shrink-0 text-muted-foreground" />
              <span className="flex-1 truncate" title={conversation.title}>
                {conversation.title}
              </span>
              <Button
                size="sm"
                variant="ghost"
                className="opacity-0 group-hover:opacity-100 h-auto p-1 hover:bg-destructive hover:text-destructive-foreground"
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteConversation(conversation.id);
                }}
              >
                <Trash2 className="w-3 h-3" />
              </Button>
            </div>
          ))}
        </div>
      </ScrollArea>

      {/* Footer Info */}
      <div className="p-4 border-t border-border text-xs text-muted-foreground">
        <div className="space-y-1">
          <div>OpenRouter API</div>
          <div>Chat • Code • Image</div>
        </div>
      </div>
    </div>
  );
};