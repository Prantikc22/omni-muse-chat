import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";

import { useSupabaseChat } from "@/hooks/useSupabaseChat";
import { useEffect } from "react";

export default function AssistantsGalleryPage() {
  const navigate = useNavigate();
  const { agents, loadAgents } = useSupabaseChat();

  useEffect(() => {
    loadAgents(); // ensure latest list on mount
  }, [loadAgents]);

  return (
    <div className="max-w-5xl mx-auto p-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-semibold">Assistants Gallery</h1>
        <Button onClick={() => navigate(-1)} variant="outline">Back</Button>
      </div>
      {agents.length === 0 ? (
        <div className="text-muted-foreground">
          No assistants yet. Use <span className="font-medium">Create Assistant</span> to make your first one.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
          {agents.map((agent) => (
            <div
              key={agent.id}
              className="border rounded-lg p-4 bg-card shadow-sm hover:shadow-md transition-shadow cursor-pointer"
            >
              <div className="font-semibold text-lg mb-2">{agent.name}</div>
              <div className="text-muted-foreground text-sm mb-2">
                {agent.description || "No description provided."}
              </div>
              <div className="text-xs text-gray-400">
                Created: {agent.created_at ? new Date(agent.created_at).toLocaleString() : "Unknown"}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

