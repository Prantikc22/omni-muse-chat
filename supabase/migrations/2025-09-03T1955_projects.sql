-- Supabase SQL: Create projects table
create table if not exists projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  name text not null,
  created_at timestamp with time zone default now()
);

-- Add project_id to conversations (chats)
alter table if exists conversations add column if not exists project_id uuid references projects(id) on delete set null;

-- Index for fast lookup
create index if not exists idx_conversations_project_id on conversations(project_id);
