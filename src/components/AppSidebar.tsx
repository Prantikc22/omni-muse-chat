import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { 
  MessageSquare, 
  Image, 
  Code2, 
  Video, 
  FolderPlus,
  Plus,
  Search,
  History,
  Settings,
  User,
  LogOut
} from 'lucide-react';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  useSidebar,
} from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useSupabaseChat } from '@/hooks/useSupabaseChat';
import { useAuth } from '@/hooks/useAuth';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const modelTypes = [
  { type: 'chat', label: 'Chat', icon: MessageSquare, description: 'General conversation' },
  { type: 'image', label: 'Image', icon: Image, description: 'Generate images' },
  { type: 'code', label: 'Code', icon: Code2, description: 'Code assistance' },
  { type: 'video-veo3', label: 'Video (Veo3)', icon: Video, description: 'Video generation' },
];

export function AppSidebar() {
  const sidebar = useSidebar();
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { 
    conversations, 
    projects, 
    createConversation, 
    createProject, 
    setActiveConversation,
    activeConversation 
  } = useSupabaseChat();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedModel, setSelectedModel] = useState<string>('chat');

  const handleNewChat = async () => {
    const conversationId = await createConversation(`New ${selectedModel} Chat`);
    if (conversationId) {
      navigate(`/chat/${conversationId}`);
    }
  };

  const handleNewProject = async () => {
    const projectId = await createProject('New Project');
    if (projectId) {
      navigate('/projects');
    }
  };

  const filteredConversations = conversations.filter(conv =>
    conv.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getNavCls = (isActive: boolean) =>
    isActive ? "bg-accent text-accent-foreground" : "hover:bg-accent/50";

  return (
    <Sidebar className={`${sidebar.state === 'collapsed' ? "w-14" : "w-80"} border-border bg-card`}>
      <SidebarHeader className="p-4">
        {sidebar.state !== 'collapsed' && (
          <>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded bg-gradient-primary flex items-center justify-center">
                <span className="text-white font-bold text-sm">L</span>
              </div>
              <span className="font-semibold text-lg">Logicwerk Labs</span>
            </div>
            
            <div className="space-y-2">
              <Button 
                onClick={handleNewChat}
                className="w-full justify-start bg-gradient-primary hover:opacity-90 transition-opacity"
              >
                <Plus className="w-4 h-4 mr-2" />
                New Chat
              </Button>
              
              <Button 
                onClick={handleNewProject}
                variant="outline" 
                className="w-full justify-start"
              >
                <FolderPlus className="w-4 h-4 mr-2" />
                New Project
              </Button>
            </div>
          </>
        )}
        
        {sidebar.state === 'collapsed' && (
          <div className="space-y-2">
            <Button size="icon" onClick={handleNewChat} className="w-10 h-10">
              <Plus className="w-4 h-4" />
            </Button>
            <Button size="icon" variant="outline" onClick={handleNewProject} className="w-10 h-10">
              <FolderPlus className="w-4 h-4" />
            </Button>
          </div>
        )}
      </SidebarHeader>

      <SidebarContent>
        {sidebar.state !== 'collapsed' && (
          <>
            {/* Search */}
            <div className="px-4 mb-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search conversations..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>

            {/* Model Types */}
            <SidebarGroup>
              <SidebarGroupLabel>Models</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {modelTypes.map((model) => (
                    <SidebarMenuItem key={model.type}>
                      <SidebarMenuButton
                        onClick={() => setSelectedModel(model.type)}
                        className={getNavCls(selectedModel === model.type)}
                      >
                        <model.icon className="w-4 h-4" />
                        <span>{model.label}</span>
                        {selectedModel === model.type && <Badge variant="secondary" className="ml-auto">Active</Badge>}
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>

            {/* Recent Conversations */}
            <SidebarGroup>
              <SidebarGroupLabel className="flex items-center gap-2">
                <History className="w-4 h-4" />
                Recent Chats
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <ScrollArea className="h-64">
                  <SidebarMenu>
                    {filteredConversations.slice(0, 10).map((conversation) => (
                      <SidebarMenuItem key={conversation.id}>
                        <SidebarMenuButton
                          onClick={() => {
                            setActiveConversation(conversation.id);
                            navigate(`/chat/${conversation.id}`);
                          }}
                          className={getNavCls(activeConversation === conversation.id)}
                        >
                          <MessageSquare className="w-4 h-4" />
                          <span className="truncate">{conversation.title}</span>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    ))}
                  </SidebarMenu>
                </ScrollArea>
              </SidebarGroupContent>
            </SidebarGroup>
          </>
        )}

        {sidebar.state === 'collapsed' && (
          <div className="px-2 space-y-2">
            {modelTypes.map((model) => (
              <Button
                key={model.type}
                size="icon"
                variant={selectedModel === model.type ? "default" : "ghost"}
                onClick={() => setSelectedModel(model.type)}
                className="w-10 h-10"
              >
                <model.icon className="w-4 h-4" />
              </Button>
            ))}
          </div>
        )}
      </SidebarContent>

      <SidebarFooter className="p-4">
        {sidebar.state !== 'collapsed' && user && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="w-full justify-start">
                <User className="w-4 h-4 mr-2" />
                <span className="truncate">{user.email}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuItem onClick={() => navigate('/settings')}>
                <Settings className="w-4 h-4 mr-2" />
                Settings
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={signOut}>
                <LogOut className="w-4 h-4 mr-2" />
                Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        {sidebar.state === 'collapsed' && user && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="icon" variant="ghost" className="w-10 h-10">
                <User className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuItem onClick={() => navigate('/settings')}>
                <Settings className="w-4 h-4 mr-2" />
                Settings
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={signOut}>
                <LogOut className="w-4 h-4 mr-2" />
                Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}