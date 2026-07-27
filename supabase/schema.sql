create extension if not exists "pgcrypto";

create table if not exists projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  title text not null,
  goal text not null default '',
  status text not null check (status in ('active', 'planning', 'blocked', 'done')),
  priority text not null check (priority in ('high', 'medium', 'low')),
  workflow_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists workflows (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  title text not null,
  nodes jsonb not null default '[]'::jsonb,
  edges jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

alter table projects
  add constraint projects_workflow_id_fkey
  foreign key (workflow_id) references workflows(id) on delete set null;

create table if not exists agents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  name text not null,
  role text not null default '',
  input text not null default '',
  output text not null default '',
  next_agent_id uuid references agents(id) on delete set null,
  status text not null check (status in ('ready', 'working', 'draft')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists inbox_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  title text not null,
  content text not null default '',
  kind text not null check (kind in ('idea', 'task', 'note')),
  processed boolean not null default false,
  created_at timestamptz not null default now()
);

alter table projects enable row level security;
alter table workflows enable row level security;
alter table agents enable row level security;
alter table inbox_items enable row level security;

create policy "users manage own projects" on projects for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "users manage own workflows" on workflows for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "users manage own agents" on agents for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "users manage own inbox" on inbox_items for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
