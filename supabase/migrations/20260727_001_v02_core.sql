begin;

create extension if not exists "pgcrypto";

create or replace function public.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default '',
  avatar_url text,
  locale text not null default 'zh-CN',
  timezone text not null default 'Asia/Shanghai',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.profiles (id, display_name)
select id, coalesce(raw_user_meta_data ->> 'display_name', '')
from auth.users
on conflict (id) do nothing;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'display_name', ''))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  title text not null,
  goal text not null default '',
  status text not null default 'planning',
  priority text not null default 'medium',
  workflow_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.projects
  add column if not exists description text not null default '',
  add column if not exists due_date date,
  add column if not exists archived_at timestamptz;

create table if not exists public.workflows (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  title text not null,
  nodes jsonb not null default '[]'::jsonb,
  edges jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.workflows
  add column if not exists project_id uuid references public.projects(id) on delete set null,
  add column if not exists description text not null default '',
  add column if not exists version integer not null default 1,
  add column if not exists is_default boolean not null default false,
  add column if not exists created_at timestamptz not null default now();

create table if not exists public.agents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  name text not null,
  role text not null default '',
  input text not null default '',
  output text not null default '',
  next_agent_id uuid references public.agents(id) on delete set null,
  status text not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.agents
  add column if not exists project_id uuid references public.projects(id) on delete set null,
  add column if not exists input_schema text not null default '',
  add column if not exists output_schema text not null default '',
  add column if not exists model text not null default '',
  add column if not exists tools jsonb not null default '[]'::jsonb;

update public.agents
set input_schema = input
where input_schema = '' and input <> '';

update public.agents
set output_schema = output
where output_schema = '' and output <> '';

create table if not exists public.inbox_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  title text not null,
  content text not null default '',
  kind text not null default 'idea',
  processed boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.inbox_items
  add column if not exists status text,
  add column if not exists processed_at timestamptz,
  add column if not exists converted_entity_type text,
  add column if not exists converted_entity_id uuid,
  add column if not exists updated_at timestamptz not null default now();

update public.inbox_items
set status = case when processed then 'processed' else 'inbox' end
where status is null;

alter table public.inbox_items
  alter column status set default 'inbox',
  alter column status set not null;

create table if not exists public.workflow_nodes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  workflow_id uuid not null references public.workflows(id) on delete cascade,
  type text not null,
  label text not null,
  owner text not null default '',
  position_x double precision not null default 0,
  position_y double precision not null default 0,
  config jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.workflow_edges (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  workflow_id uuid not null references public.workflows(id) on delete cascade,
  source_node_id uuid not null references public.workflow_nodes(id) on delete cascade,
  target_node_id uuid not null references public.workflow_nodes(id) on delete cascade,
  label text not null default '',
  animated boolean not null default false,
  config jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.prompts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  project_id uuid references public.projects(id) on delete set null,
  title text not null,
  description text not null default '',
  current_version_id uuid,
  tags text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.prompt_versions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  prompt_id uuid not null references public.prompts(id) on delete cascade,
  version integer not null,
  content text not null,
  model text not null default '',
  variables jsonb not null default '[]'::jsonb,
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (prompt_id, version)
);

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'prompts_current_version_id_fkey'
      and conrelid = 'public.prompts'::regclass
  ) then
    alter table public.prompts
      add constraint prompts_current_version_id_fkey
      foreign key (current_version_id)
      references public.prompt_versions(id)
      on delete set null;
  end if;
end;
$$;

create table if not exists public.knowledge_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  project_id uuid references public.projects(id) on delete set null,
  title text not null,
  content text not null default '',
  type text not null default 'note',
  tags text[] not null default '{}',
  source_url text,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.skills (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  parent_id uuid references public.skills(id) on delete set null,
  level integer not null default 1,
  experience integer not null default 0,
  description text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.skill_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  skill_id uuid not null references public.skills(id) on delete cascade,
  project_id uuid references public.projects(id) on delete set null,
  delta integer not null,
  reason text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.resources (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  project_id uuid references public.projects(id) on delete set null,
  name text not null,
  type text not null default 'other',
  url text,
  notes text not null default '',
  secret_ref text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.activity_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  entity_type text not null,
  entity_id uuid,
  action text not null,
  summary text not null default '',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.migration_runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  source text not null,
  source_version text not null,
  status text not null default 'running',
  summary jsonb not null default '{}'::jsonb,
  error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

do $$
begin
  if exists (select 1 from public.projects where user_id is null)
     or exists (select 1 from public.workflows where user_id is null)
     or exists (select 1 from public.agents where user_id is null)
     or exists (select 1 from public.inbox_items where user_id is null) then
    raise exception 'v0.2 migration stopped: legacy rows without user_id must be assigned before cloud enablement';
  end if;
end;
$$;

alter table public.projects alter column user_id set not null;
alter table public.workflows alter column user_id set not null;
alter table public.agents alter column user_id set not null;
alter table public.inbox_items alter column user_id set not null;

alter table public.projects drop constraint if exists projects_status_check;
alter table public.projects
  add constraint projects_status_check check (status in ('planning', 'active', 'blocked', 'done'));
alter table public.projects drop constraint if exists projects_priority_check;
alter table public.projects
  add constraint projects_priority_check check (priority in ('low', 'medium', 'high'));

alter table public.agents drop constraint if exists agents_status_check;
alter table public.agents
  add constraint agents_status_check check (status in ('draft', 'ready', 'working', 'paused', 'error'));

alter table public.inbox_items drop constraint if exists inbox_items_kind_check;
alter table public.inbox_items
  add constraint inbox_items_kind_check check (kind in ('idea', 'task', 'note'));
alter table public.inbox_items drop constraint if exists inbox_items_status_check;
alter table public.inbox_items
  add constraint inbox_items_status_check check (status in ('inbox', 'processed', 'archived'));

alter table public.workflow_nodes drop constraint if exists workflow_nodes_type_check;
alter table public.workflow_nodes
  add constraint workflow_nodes_type_check check (type in ('trigger', 'agent', 'review', 'condition', 'output'));

alter table public.knowledge_items drop constraint if exists knowledge_items_type_check;
alter table public.knowledge_items
  add constraint knowledge_items_type_check check (type in ('note', 'decision', 'lesson', 'reference'));

alter table public.skills drop constraint if exists skills_level_check;
alter table public.skills
  add constraint skills_level_check check (level between 1 and 100);
alter table public.skills drop constraint if exists skills_experience_check;
alter table public.skills
  add constraint skills_experience_check check (experience >= 0);

alter table public.resources drop constraint if exists resources_type_check;
alter table public.resources
  add constraint resources_type_check check (type in ('link', 'document', 'api', 'tool', 'account', 'other'));

alter table public.migration_runs drop constraint if exists migration_runs_status_check;
alter table public.migration_runs
  add constraint migration_runs_status_check check (status in ('running', 'success', 'failed'));

create unique index if not exists migration_runs_one_success_per_source
  on public.migration_runs (user_id, source, source_version)
  where status = 'success';

create index if not exists projects_user_updated_idx on public.projects (user_id, updated_at desc);
create index if not exists workflows_user_updated_idx on public.workflows (user_id, updated_at desc);
create index if not exists workflows_project_idx on public.workflows (project_id);
create index if not exists workflow_nodes_user_updated_idx on public.workflow_nodes (user_id, updated_at desc);
create index if not exists workflow_nodes_workflow_idx on public.workflow_nodes (workflow_id);
create index if not exists workflow_edges_user_updated_idx on public.workflow_edges (user_id, updated_at desc);
create index if not exists workflow_edges_workflow_idx on public.workflow_edges (workflow_id);
create index if not exists agents_user_updated_idx on public.agents (user_id, updated_at desc);
create index if not exists inbox_items_user_updated_idx on public.inbox_items (user_id, updated_at desc);
create index if not exists prompts_user_updated_idx on public.prompts (user_id, updated_at desc);
create index if not exists prompts_user_title_idx on public.prompts (user_id, title);
create index if not exists prompts_tags_idx on public.prompts using gin (tags);
create index if not exists prompt_versions_user_updated_idx on public.prompt_versions (user_id, updated_at desc);
create index if not exists knowledge_items_user_updated_idx on public.knowledge_items (user_id, updated_at desc);
create index if not exists knowledge_items_user_title_idx on public.knowledge_items (user_id, title);
create index if not exists knowledge_items_tags_idx on public.knowledge_items using gin (tags);
create index if not exists skills_user_updated_idx on public.skills (user_id, updated_at desc);
create index if not exists skill_events_user_updated_idx on public.skill_events (user_id, updated_at desc);
create index if not exists resources_user_updated_idx on public.resources (user_id, updated_at desc);
create index if not exists activity_logs_user_created_idx on public.activity_logs (user_id, created_at desc);
create index if not exists migration_runs_user_updated_idx on public.migration_runs (user_id, updated_at desc);

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'projects', 'workflows', 'workflow_nodes', 'workflow_edges', 'agents',
    'inbox_items', 'prompts', 'prompt_versions', 'knowledge_items', 'skills',
    'skill_events', 'resources', 'activity_logs', 'migration_runs'
  ]
  loop
    execute format('alter table public.%I enable row level security', table_name);
    execute format('drop policy if exists "select own rows" on public.%I', table_name);
    execute format('drop policy if exists "insert own rows" on public.%I', table_name);
    execute format('drop policy if exists "update own rows" on public.%I', table_name);
    execute format('drop policy if exists "delete own rows" on public.%I', table_name);
    execute format(
      'create policy "select own rows" on public.%I for select using (auth.uid() = user_id)',
      table_name
    );
    execute format(
      'create policy "insert own rows" on public.%I for insert with check (auth.uid() = user_id)',
      table_name
    );
    execute format(
      'create policy "update own rows" on public.%I for update using (auth.uid() = user_id) with check (auth.uid() = user_id)',
      table_name
    );
    execute format(
      'create policy "delete own rows" on public.%I for delete using (auth.uid() = user_id)',
      table_name
    );
  end loop;
end;
$$;

drop policy if exists "users manage own projects" on public.projects;
drop policy if exists "users manage own workflows" on public.workflows;
drop policy if exists "users manage own agents" on public.agents;
drop policy if exists "users manage own inbox" on public.inbox_items;

alter table public.profiles enable row level security;
drop policy if exists "select own profile" on public.profiles;
drop policy if exists "insert own profile" on public.profiles;
drop policy if exists "update own profile" on public.profiles;
drop policy if exists "delete own profile" on public.profiles;
create policy "select own profile" on public.profiles
  for select using (auth.uid() = id);
create policy "insert own profile" on public.profiles
  for insert with check (auth.uid() = id);
create policy "update own profile" on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);
create policy "delete own profile" on public.profiles
  for delete using (auth.uid() = id);

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'profiles', 'projects', 'workflows', 'workflow_nodes', 'workflow_edges',
    'agents', 'inbox_items', 'prompts', 'prompt_versions', 'knowledge_items',
    'skills', 'skill_events', 'resources', 'activity_logs', 'migration_runs'
  ]
  loop
    execute format('drop trigger if exists set_%I_updated_at on public.%I', table_name, table_name);
    execute format(
      'create trigger set_%I_updated_at before update on public.%I for each row execute function public.set_updated_at()',
      table_name,
      table_name
    );
  end loop;
end;
$$;

commit;
