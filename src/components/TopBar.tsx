// src/components/TopBar.tsx
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Wand2, Bot, ArrowUpCircle } from "lucide-react";
import { ShareChatModal } from "@/components/ShareChatModal";
import PricingModal from "@/components/PricingModal";

interface TopBarProps {
  onOpenBuildAgent: () => void;
}

export default function TopBar({ onOpenBuildAgent }: TopBarProps) {
  const navigate = useNavigate();
  const [shareOpen, setShareOpen] = useState(false);
  const [pricingOpen, setPricingOpen] = useState(false);

  // TODO: fetch user's real plan from Supabase subscriptions
  const currentPlan = "free";

  // Build the shareable link for current chat (if on a chat page)
  const chatId =
    typeof window !== "undefined" &&
    window.location.pathname.split("/").includes("chat")
      ? window.location.pathname.split("/").pop()
      : null;

  let shareUrl = chatId
    ? `${window.location.origin}/chat/${chatId}`
    : window.location.href;

  if (!shareUrl.includes("?")) {
    shareUrl += "?view";
  } else if (!shareUrl.includes("view")) {
    shareUrl += "&view";
  }

  return (
    <>
      <div className="border-b border-border bg-card/60 backdrop-blur supports-[backdrop-filter]:bg-card/40 fixed top-0 left-[20rem] w-[calc(100vw-20rem)] z-30">
        <div className="px-4 h-14 flex items-center justify-end">
          <div className="flex items-center gap-2">
            

            <Button
  size="sm"
  onClick={onOpenBuildAgent}
  className="gap-2 font-bold text-white border-2 border-blue-400 shadow-[0_0_12px_0_rgba(0,234,255,0.35)] bg-gradient-to-r from-blue-600 via-indigo-500 to-cyan-400 hover:from-cyan-400 hover:to-blue-600 hover:shadow-[0_0_24px_4px_rgba(0,234,255,0.5)] transition-all duration-200"
>
  <Wand2 className="w-4 h-4" />
  Build AI Agent
</Button>

            <Button
              size="sm"
              variant="outline"
              className="gap-2"
              onClick={() => setShareOpen(true)}
              title="Copy shareable link"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13.828 10.172a4 4 0 010 5.656m0 0l-3.536 3.536a4 4 0 01-5.656-5.656l3.536-3.536a4 4 0 015.656 5.656zm-3.536-3.536a4 4 0 015.656 0"
                />
              </svg>
              Share
            </Button>

            
          </div>
        </div>
      </div>

      <ShareChatModal
        open={shareOpen}
        onOpenChange={setShareOpen}
        shareUrl={shareUrl}
      />

      <PricingModal
        open={pricingOpen}
        onOpenChange={setPricingOpen}
        currentPlan={currentPlan}
      />
    </>
  );
}
