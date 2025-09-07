// src/components/AppSidebar.tsx
import "@/brand.css";
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  MessageSquare,
  Image as ImageIcon,
  Code2,
  Video,
  FolderPlus,
  Plus,
  Search,
  History,
  Settings,
  User,
  LogOut,
  MoreVertical,   // dotted menu
  Layers,         // "All chats" icon
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
import type { ModelType } from '@/hooks/useSupabaseChat';

const modelTypes: { type: ModelType; label: string; icon: any; description: string }[] = [
  { type: 'chat', label: 'Chat', icon: MessageSquare, description: 'General conversation' },
  { type: 'image', label: 'Image', icon: ImageIcon, description: 'Generate images' },
  { type: 'code', label: 'Code', icon: Code2, description: 'Code assistance' },
  { type: 'video-veo3', label: 'Video (Veo3)', icon: Video, description: 'Video generation' },
  { type: 'video-bytedance', label: 'Video (ByteDance)', icon: Video, description: 'ByteDance video generation' },
  { type: 'analyzer', label: 'Analyzer', icon: Search, description: 'Sentiment, summary & bug check' },
];

interface AppSidebarProps {
  selectedModel: ModelType;
  setSelectedModel: (model: ModelType) => void;
}

export function AppSidebar({ selectedModel, setSelectedModel }: AppSidebarProps) {
  const sidebar = useSidebar();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();

  const {
    conversations,
    projects,
    createConversation,
    createProject,
    setActiveConversation,
    activeConversation,
    searchMessages,
    updateConversationProject,   // now supports null
    deleteConversation,          // for chats
    deleteProject,               // for projects
    agents,
    selectedAgent,
    setSelectedAgent,
  } = useSupabaseChat();

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);

  // Projects state
  const [showProjectModal, setShowProjectModal] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [selectedProject, setSelectedProject] = useState<string | null>(null);
  const [projectsCollapsed, setProjectsCollapsed] = useState(true);

  const handleNewChat = async () => {
    const conversationId = await createConversation(`New ${selectedModel} Chat`);
    if (conversationId) navigate(`/chat/${conversationId}`);
  };

  const handleNewProject = () => setShowProjectModal(true);

  const handleProjectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjectName.trim()) return;
    const projectId = await createProject(newProjectName.trim());
    if (projectId) {
      setShowProjectModal(false);
      setNewProjectName('');
      setSelectedProject(projectId);
    }
  };

  // Toggle active project; clicking the same project unselects it
  const handleProjectSelect = (projectId: string) => {
    setSelectedProject(prev => (prev === projectId ? null : projectId));
  };

  // Project + search combined filter
  const filteredConversations = conversations
    .filter(c => (selectedProject ? c.project_id === selectedProject : true))
    .filter(c => c.title.toLowerCase().includes(searchQuery.toLowerCase()));

  useEffect(() => {
    const runSearch = async () => {
      if (searchQuery.trim() === '') {
        setSearchResults([]);
        return;
      }
      const results = await searchMessages(searchQuery);
      setSearchResults(results);
    };
    runSearch();
  }, [searchQuery, searchMessages]);

  const getNavCls = (isActive: boolean) =>
    isActive ? 'bg-accent text-accent-foreground' : 'hover:bg-accent/50';

  return (
    <Sidebar className={`${sidebar.state === 'collapsed' ? 'w-14' : 'w-80'} border-border bg-card`}>
      <SidebarHeader className="p-4">
        {sidebar.state !== 'collapsed' ? (
          <>
            <div className="flex items-center gap-2 mb-4">
              
              <span className="brand-orbis text-2xl">Orbis</span>
            </div>

            <div className="space-y-2">
              <Button
                onClick={handleNewChat}
                className="w-full justify-start bg-gradient-primary hover:opacity-90 transition-opacity"
              >
                <Plus className="w-4 h-4 mr-2" /> New Chat
              </Button>

              {/* Single search box */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search conversations or messages..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>

              <Button onClick={handleNewProject} variant="outline" className="w-full justify-start mt-1">
                <FolderPlus className="w-4 h-4 mr-2" /> New Project
              </Button>
            </div>
          </>
        ) : (
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
        {sidebar.state !== 'collapsed' ? (
          <>
            {/* Projects */}
            <SidebarGroup>
              <SidebarGroupLabel
                className="flex items-center gap-2 cursor-pointer"
                onClick={() => setProjectsCollapsed(v => !v)}
              >
                <FolderPlus className="w-4 h-4" /> Projects
                <span className="ml-auto">{projectsCollapsed ? '+' : '-'}</span>
              </SidebarGroupLabel>

              {!projectsCollapsed && (
                <SidebarGroupContent>
                  <SidebarMenu>
                    {/* All chats */}
                    <SidebarMenuItem className="group flex items-center">
                      <SidebarMenuButton
                        onClick={() => setSelectedProject(null)}
                        className={`flex-1 ${getNavCls(selectedProject === null)}`}
                      >
                        <Layers className="w-4 h-4" />
                        <span className="truncate">All chats</span>
                        {selectedProject === null && <Badge variant="secondary" className="ml-auto">Active</Badge>}
                      </SidebarMenuButton>
                    </SidebarMenuItem>

                    {/* Project rows with right-aligned dotted menu */}
                    {projects.map((project) => (
                      <SidebarMenuItem key={project.id} className="group flex items-center">
                        <SidebarMenuButton
                          onClick={() => handleProjectSelect(project.id)}
                          className={`flex-1 ${getNavCls(selectedProject === project.id)}`}
                        >
                          <span className="truncate">{project.title}</span>
                          {selectedProject === project.id && (
                            <Badge variant="secondary" className="ml-auto">Active</Badge>
                          )}
                        </SidebarMenuButton>

                        {/* Dotted menu aligned right */}
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="ml-1 opacity-0 group-hover:opacity-100 data-[state=open]:opacity-100"
                              onClick={(e) => e.stopPropagation()}
                              aria-label="Project options"
                            >
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedProject(project.id);
                              }}
                            >
                              View only this project
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedProject(null);
                              }}
                            >
                              Show all chats
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (confirm(`Delete project "${project.title}"? Chats will NOT be deleted.`)) {
                                  deleteProject(project.id);
                                  if (selectedProject === project.id) setSelectedProject(null);
                                }
                              }}
                            >
                              Delete project
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </SidebarMenuItem>
                    ))}
                  </SidebarMenu>
                </SidebarGroupContent>
              )}
            </SidebarGroup>


            {/* Models */}
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

            {/* Chats */}
            <SidebarGroup>
              <SidebarGroupLabel className="flex items-center gap-2">
                <History className="w-4 h-4" /> {searchQuery.trim() === '' ? 'Recent Chats' : 'Search Results'}
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <ScrollArea className="h-64">
                  <SidebarMenu>
                    {searchQuery.trim() === ''
                      ? filteredConversations.slice(0, 10).map((conversation) => (
                          <SidebarMenuItem key={conversation.id} className="group flex items-center">
                            {/* Clickable section */}
                            <SidebarMenuButton
                              onClick={() => {
                                setActiveConversation(conversation.id);
                                navigate(`/chat/${conversation.id}`);
                              }}
                              className={`flex-1 ${getNavCls(activeConversation === conversation.id)}`}
                            >
                              <MessageSquare className="w-4 h-4" />
                              <span className="truncate">{conversation.title}</span>
                            </SidebarMenuButton>

                            {/* Right-aligned dotted menu */}
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="ml-1 opacity-0 group-hover:opacity-100 data-[state=open]:opacity-100"
                                  onClick={(e) => e.stopPropagation()}
                                  aria-label="Chat options"
                                >
                                  <MoreVertical className="w-4 h-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem disabled>Assign to project</DropdownMenuItem>
                                {projects.map((project) => (
                                  <DropdownMenuItem
                                    key={project.id}
                                    disabled={conversation.project_id === project.id}
                                    onClick={async (e) => {
                                      e.stopPropagation();
                                      await updateConversationProject(conversation.id, project.id);
                                    }}
                                  >
                                    {project.title}
                                  </DropdownMenuItem>
                                ))}

                                {conversation.project_id && (
                                  <>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem
                                      onClick={async (e) => {
                                        e.stopPropagation();
                                        await updateConversationProject(conversation.id, null);
                                      }}
                                    >
                                      Remove from project
                                    </DropdownMenuItem>
                                  </>
                                )}

                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  className="text-destructive"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (confirm(`Delete chat "${conversation.title}"? This cannot be undone.`)) {
                                      deleteConversation(conversation.id);
                                    }
                                  }}
                                >
                                  Delete chat
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </SidebarMenuItem>
                        ))
                      : searchResults.map((res) => (
                          <SidebarMenuItem key={res.id} className="group flex items-center">
                            <SidebarMenuButton
                              onClick={() => {
                                setActiveConversation(res.conversation_id);
                                navigate(`/chat/${res.conversation_id}`);
                              }}
                              className="flex-1"
                            >
                              <MessageSquare className="w-4 h-4" />
                              <div className="flex flex-col text-left">
                                <span className="truncate text-sm font-medium">
                                  {res.conversations?.title || 'Untitled'}
                                </span>
                                <span className="truncate text-xs text-muted-foreground">{res.content}</span>
                              </div>
                            </SidebarMenuButton>
                          </SidebarMenuItem>
                        ))}
                  </SidebarMenu>
                </ScrollArea>
              </SidebarGroupContent>
            </SidebarGroup>
          </>
        ) : (
          <div className="px-2 space-y-2">
            {modelTypes.map((model) => (
              <Button
                key={model.type}
                size="icon"
                variant={selectedModel === model.type ? 'default' : 'ghost'}
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
        <Button
          variant="outline"
          className="w-full justify-start mb-2"
          onClick={() => {
            const root = window.document.documentElement;
            const isDark = root.classList.contains('dark');
            if (isDark) {
              root.classList.remove('dark');
              localStorage.setItem('theme', 'light');
            } else {
              root.classList.add('dark');
              localStorage.setItem('theme', 'dark');
            }
          }}
          aria-label="Toggle dark mode"
        >
          <span className="mr-2">🌓</span> Toggle Dark Mode
        </Button>

        {sidebar.state !== 'collapsed' && user && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="w-full justify-start">
                <User className="w-4 h-4 mr-2" /> <span className="truncate">{user.email}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuItem onClick={() => navigate('/settings')}>
                <Settings className="w-4 h-4 mr-2" /> Settings
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={signOut}>
                <LogOut className="w-4 h-4 mr-2" /> Sign Out
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
                <Settings className="w-4 h-4 mr-2" /> Settings
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={signOut}>
                <LogOut className="w-4 h-4 mr-2" /> Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
