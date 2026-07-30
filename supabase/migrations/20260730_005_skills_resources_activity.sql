begin;

alter table public.skills
  drop constraint if exists skills_parent_not_self_check;
alter table public.skills
  add constraint skills_parent_not_self_check check (parent_id is null or parent_id <> id);

alter table public.skill_events
  drop constraint if exists skill_events_delta_check;
alter table public.skill_events
  add constraint skill_events_delta_check check (delta <> 0 and delta between -100000 and 100000);

alter table public.resources
  drop constraint if exists resources_metadata_object_check;
alter table public.resources
  add constraint resources_metadata_object_check
  check (jsonb_typeof(metadata) = 'object');

create index if not exists skills_parent_idx
  on public.skills (user_id, parent_id, name);
create index if not exists skill_events_skill_created_idx
  on public.skill_events (user_id, skill_id, created_at desc);
create index if not exists resources_project_idx
  on public.resources (user_id, project_id, updated_at desc);

create or replace function public.validate_skill_hierarchy()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  if new.parent_id is null then return new; end if;

  if not exists (
    select 1 from public.skills
    where id = new.parent_id and user_id = new.user_id
  ) then
    raise exception 'parent skill not found' using errcode = 'P0002';
  end if;

  if exists (
    with recursive ancestors as (
      select id, parent_id
      from public.skills
      where id = new.parent_id and user_id = new.user_id
      union all
      select parent.id, parent.parent_id
      from public.skills parent
      join ancestors child on parent.id = child.parent_id
      where parent.user_id = new.user_id
    )
    select 1 from ancestors where id = new.id
  ) then
    raise exception 'skill hierarchy cannot contain a cycle' using errcode = '23514';
  end if;

  return new;
end;
$$;

drop trigger if exists validate_skill_hierarchy on public.skills;
create trigger validate_skill_hierarchy
before insert or update of parent_id, user_id on public.skills
for each row execute function public.validate_skill_hierarchy();

create or replace function public.add_skill_experience(
  p_skill_id uuid,
  p_delta integer,
  p_reason text,
  p_project_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_skill public.skills;
  v_event public.skill_events;
begin
  if v_user_id is null then
    raise exception 'authentication required' using errcode = '42501';
  end if;
  if p_delta = 0 or p_delta < -100000 or p_delta > 100000 then
    raise exception 'invalid experience delta' using errcode = '22023';
  end if;
  if length(trim(coalesce(p_reason, ''))) = 0 then
    raise exception 'experience reason is required' using errcode = '22023';
  end if;
  if p_project_id is not null and not exists (
    select 1 from public.projects
    where id = p_project_id and user_id = v_user_id
  ) then
    raise exception 'project not found' using errcode = 'P0002';
  end if;

  select * into v_skill
  from public.skills
  where id = p_skill_id and user_id = v_user_id
  for update;

  if not found then
    raise exception 'skill not found' using errcode = 'P0002';
  end if;
  if v_skill.experience + p_delta < 0 then
    raise exception 'experience cannot be negative' using errcode = '22023';
  end if;

  insert into public.skill_events (user_id, skill_id, project_id, delta, reason)
  values (v_user_id, p_skill_id, p_project_id, p_delta, trim(p_reason))
  returning * into v_event;

  update public.skills
  set experience = experience + p_delta
  where id = p_skill_id and user_id = v_user_id
  returning * into v_skill;

  return jsonb_build_object(
    'skill', to_jsonb(v_skill),
    'event', to_jsonb(v_event)
  );
end;
$$;

revoke all on function public.add_skill_experience(uuid, integer, text, uuid) from public;
grant execute on function public.add_skill_experience(uuid, integer, text, uuid) to authenticated;
revoke insert, update, delete on table public.skill_events from authenticated;

drop policy if exists "insert own resources" on public.resources;
drop policy if exists "update own resources" on public.resources;
create policy "insert own resources" on public.resources
for insert with check (
  (select auth.uid()) = user_id
  and (
    project_id is null
    or exists (
      select 1 from public.projects
      where projects.id = resources.project_id
        and projects.user_id = (select auth.uid())
    )
  )
);
create policy "update own resources" on public.resources
for update using ((select auth.uid()) = user_id)
with check (
  (select auth.uid()) = user_id
  and (
    project_id is null
    or exists (
      select 1 from public.projects
      where projects.id = resources.project_id
        and projects.user_id = (select auth.uid())
    )
  )
);

create or replace function public.capture_project_os_activity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row jsonb := case when tg_op = 'DELETE' then to_jsonb(old) else to_jsonb(new) end;
  v_old jsonb := case when tg_op = 'UPDATE' then to_jsonb(old) else '{}'::jsonb end;
  v_user_id uuid := (v_row ->> 'user_id')::uuid;
  v_entity_id uuid := nullif(v_row ->> 'id', '')::uuid;
  v_title text := coalesce(
    nullif(v_row ->> 'title', ''),
    nullif(v_row ->> 'name', ''),
    nullif(v_row ->> 'label', ''),
    tg_table_name
  );
  v_action text := lower(tg_op);
begin
  if tg_table_name in ('activity_logs', 'migration_runs') then
    if tg_op = 'DELETE' then return old; end if;
    return new;
  end if;

  if tg_op = 'UPDATE' then
    if tg_table_name = 'projects'
      and v_old ->> 'status' <> v_row ->> 'status'
      and v_row ->> 'status' = 'done' then
      v_action := 'completed';
    elsif tg_table_name = 'inbox_items'
      and coalesce(v_old ->> 'status', 'inbox') <> coalesce(v_row ->> 'status', 'inbox')
      and v_row ->> 'status' = 'processed' then
      v_action := 'processed';
    elsif (v_old ->> 'archived_at') is null and (v_row ->> 'archived_at') is not null then
      v_action := 'archived';
    end if;
  end if;

  insert into public.activity_logs (
    user_id,
    entity_type,
    entity_id,
    action,
    summary,
    metadata
  )
  values (
    v_user_id,
    tg_table_name,
    v_entity_id,
    v_action,
    left(v_title, 240),
    jsonb_build_object('source', 'database_trigger')
  );

  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'projects', 'workflows', 'agents', 'inbox_items', 'prompts',
    'knowledge_items', 'skills', 'skill_events', 'resources'
  ]
  loop
    execute format(
      'drop trigger if exists capture_%I_activity on public.%I',
      table_name,
      table_name
    );
    execute format(
      'create trigger capture_%I_activity after insert or update or delete on public.%I
       for each row execute function public.capture_project_os_activity()',
      table_name,
      table_name
    );
  end loop;
end;
$$;

commit;
