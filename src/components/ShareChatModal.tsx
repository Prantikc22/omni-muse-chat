import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface ShareChatModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  shareUrl: string;
}

export function ShareChatModal({ open, onOpenChange, shareUrl }: ShareChatModalProps) {
  const [copied, setCopied] = useState(false);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Share public link to chat</DialogTitle>
          <DialogDescription>
            <div className="flex items-center gap-2 text-sm bg-muted rounded p-2 mb-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M12 20a8 8 0 100-16 8 8 0 000 16z" /></svg>
              This conversation may include personal information. Take a moment to check content before sharing the link.
            </div>
            <span className="text-xs text-muted-foreground block mb-2">Your name, custom instructions, and any messages you add after sharing stay private.</span>
          </DialogDescription>
        </DialogHeader>
        <div className="flex items-center gap-2 mt-4">
          <input
            type="text"
            readOnly
            value={shareUrl}
            className="flex-1 bg-muted rounded px-2 py-1 text-sm border border-border"
            onFocus={e => e.target.select()}
          />
          <Button
            size="sm"
            onClick={async () => {
              await navigator.clipboard.writeText(shareUrl);
              setCopied(true);
              setTimeout(() => setCopied(false), 1500);
            }}
            variant="outline"
          >
            {copied ? "Copied!" : "Copy link"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
