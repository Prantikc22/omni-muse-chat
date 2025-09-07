// src/pages/AgentsPage.tsx
import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AgentCreateModal } from '@/components/AgentCreateModal';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';

interface AgentRow {
  id: string;
  name: string;
  description?: string;
  persona_json: any;
  is_published: boolean;
  created_by?: string;
  created_at?: string;
  updated_at?: string;
}

export default function AgentsPage() {
  const [agents, setAgents] = useState<AgentRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();

  const loadAllAgents = async () => {
    setLoading(true);
    try {
      // Use `any` here to avoid TS schema mismatches from generated types.
      const res = await supabase
        .from<any, any>('agents')
        .select('*')
        .order('created_at', { ascending: false });

      if (res.error) {
        throw res.error;
      }

      // Cast to AgentRow[] AFTER we've confirmed there's no error.
      const payload = (res.data || []) as unknown as AgentRow[];
      setAgents(payload);
    } catch (err) {
      console.error('Failed to load agents', err);
      toast.error('Failed to load agents');
      setAgents([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllAgents();
  }, []);

  const togglePublish = async (agent: AgentRow) => {
    try {
      const payload = { is_published: !agent.is_published } as any;

      const res = await (supabase
        .from<any, any>('agents')
        .update(payload)
        .eq('id', agent.id)
        .select()
        .single() as any);

      if (res.error) throw res.error;

      toast.success(!agent.is_published ? 'Published' : 'Unpublished');
      await loadAllAgents();
    } catch (err) {
      console.error('toggle publish', err);
      toast.error('Failed to update agent');
    }
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold">Agents</h1>
          <p className="text-sm text-muted-foreground">Pre-made agents and your agents — pick one to shape the assistant behavior.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={() => navigate('/')}>Back to chat</Button>
          <Button variant="default" onClick={() => setCreateOpen(true)}>+ New Agent</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {agents.map((a) => (
          <div key={a.id} className="p-4 rounded-lg border border-border bg-card flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-lg">
                  {a.persona_json?.metadata?.behavior_flags?.persona_icon || '🤖'} {a.name}
                </h3>
                {a.is_published ? <Badge variant="secondary">Published</Badge> : <Badge>Draft</Badge>}
              </div>
              <p className="text-sm text-muted-foreground mt-2">
                {a.description || a.persona_json?.metadata?.summary || 'No description'}
              </p>
              <div className="mt-3 text-xs whitespace-pre-wrap max-h-28 overflow-auto bg-muted p-2 rounded text-muted-foreground">
                <strong>System prompt:</strong>
                <div className="mt-1">{a.persona_json?.system_prompt || '(none)'}</div>
              </div>
            </div>

            <div className="mt-4 flex items-center gap-2">
              <Button size="sm" onClick={() => {
                localStorage.setItem('selected_agent', JSON.stringify(a));
                toast.success('Selected agent. Switch to chat to use it.');
                navigate('/');
              }}>Select</Button>

              {user?.id === a.created_by && (
                <Button size="sm" variant="outline" onClick={() => togglePublish(a)}>
                  {a.is_published ? 'Unpublish' : 'Publish'}
                </Button>
              )}

              <Button size="sm" variant="ghost" onClick={() => {
                window.open(`/agents/${a.id}`, '_blank');
              }}>
                View
              </Button>
            </div>
          </div>
        ))}
      </div>

      <AgentCreateModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={async () => {
          await loadAllAgents();
        }}
      />
    </div>
  );
}
