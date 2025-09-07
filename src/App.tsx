import { useEffect, useState } from "react";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { SidebarProvider } from "@/components/ui/sidebar";
import { useAuth } from "@/hooks/useAuth";
import { AuthPage } from "@/components/AuthPage";
import { AppSidebar } from "@/components/AppSidebar";
import { GrokChatInterface } from "@/components/GrokChatInterface";
import { Loader2 } from "lucide-react";
import type { ModelType } from "@/hooks/useSupabaseChat"; // ✅ use your union type
import AssistantsGalleryPage from "@/pages/AgentsGalleryPage";
import AgentsPage from '@/pages/AgentsPage';
// e.g. src/App.tsx or where you declare routes
import BillingSuccessPage from "@/pages/BillingSuccess";


const queryClient = new QueryClient();

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  return <>{children}</>;
};

interface MainLayoutProps {
  children: React.ReactNode;
  selectedModel: ModelType;
  setSelectedModel: (model: ModelType) => void;
}

const MainLayout = ({ children, selectedModel, setSelectedModel }: MainLayoutProps) => (
  <SidebarProvider>
    <div className="min-h-screen flex w-full bg-background">
      <AppSidebar selectedModel={selectedModel} setSelectedModel={setSelectedModel} />
      <main className="flex-1">{children}</main>
    </div>
  </SidebarProvider>
);

const App = () => {
  // Model selection state
  const [selectedModel, setSelectedModel] = useState<ModelType>("chat");

  // Dark mode logic
  useEffect(() => {
    const root = window.document.documentElement;
    const saved = localStorage.getItem("theme");
    const systemDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    if (saved === "dark" || (!saved && systemDark)) {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <BrowserRouter>
          {/* Sidebar always rendered outside of routes */}
          <Routes>
            <Route path="/auth" element={<AuthPage />} />
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <MainLayout
                    selectedModel={selectedModel}
                    setSelectedModel={setSelectedModel}
                  >
                    <GrokChatInterface selectedModel={selectedModel} />
                  </MainLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/chat/:conversationId?"
              element={
                typeof window !== 'undefined' && (window.location.search.includes('readonly') || window.location.search.includes('view')) ? (
                  <MainLayout
                    selectedModel={selectedModel}
                    setSelectedModel={setSelectedModel}
                  >
                    <GrokChatInterface selectedModel={selectedModel} />
                  </MainLayout>
                ) : (
                  <ProtectedRoute>
                    <MainLayout
                      selectedModel={selectedModel}
                      setSelectedModel={setSelectedModel}
                    >
                      <GrokChatInterface selectedModel={selectedModel} />
                    </MainLayout>
                  </ProtectedRoute>
                )
              }
            />
            <Route
              path="/projects"
              element={
                <ProtectedRoute>
                  <MainLayout
                    selectedModel={selectedModel}
                    setSelectedModel={setSelectedModel}
                  >
                    <div className="p-8 text-lg">Projects page coming soon.</div>
                  </MainLayout>
                </ProtectedRoute>
              }
            />
            <Route path="/assistants-gallery" element={<AssistantsGalleryPage />} />
            <Route path="/agents" element={<AgentsPage />} />
            <Route path="/billing/success" element={<BillingSuccessPage />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
