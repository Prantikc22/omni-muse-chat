// src/components/AgentCreateModal.tsx
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Switch } from '@/components/ui/switch';

interface AgentCreateModalProps {
  open: boolean;
  onClose: () => void;
  onCreated?: (agent: any) => void;
}

export const AgentCreateModal = ({ open, onClose, onCreated }: AgentCreateModalProps) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [systemPrompt, setSystemPrompt] = useState('');
  const [saving, setSaving] = useState(false);
  const [publishNow, setPublishNow] = useState(false); // toggle for quick testing

  const handleCreate = async () => {
    if (!name.trim() || !systemPrompt.trim()) {
      toast.error('Please provide a name and system prompt');
      return;
    }

    setSaving(true);
    try {
      const persona_json = {
        system_prompt: systemPrompt,
        metadata: {
          behavior_flags: { persona_icon: '🤖' },
          instructions: '',
          temperature: 0.2,
        },
        safety: {},
      };

      // use (supabase as any) to avoid TypeScript schema errors until you regenerate types
const { data, error } = await (supabase as any)
.from('agents')
.insert([
  {
    name: name.trim(),
    slug: name.trim().toLowerCase().replace(/\s+/g, '-'),
    description: description.trim(),
    persona_json,
    is_published: publishNow,
  },
])
.select()
.single();

    

      if (error) throw error;

      toast.success(publishNow ? 'Agent created and published' : 'Agent created (unpublished)');
      setName('');
      setDescription('');
      setSystemPrompt('');
      setPublishNow(false);
      onCreated?.(data);
      onClose();
    } catch (err: any) {
      console.error('Failed to create agent', err);
      toast.error('Failed to create agent');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Create new Agent</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <Input
            placeholder="Agent name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <Input
            placeholder="Short description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
          <Textarea
            placeholder="System prompt (how the agent should behave)"
            rows={6}
            value={systemPrompt}
            onChange={(e) => setSystemPrompt(e.target.value)}
          />
          <div className="flex items-center gap-3">
            <Switch checked={publishNow} onCheckedChange={(v) => setPublishNow(Boolean(v))} />
            <div className="text-sm">Publish now (visible to everyone)</div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleCreate} disabled={saving}>
            {saving ? 'Saving...' : publishNow ? 'Create & Publish' : 'Create'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
