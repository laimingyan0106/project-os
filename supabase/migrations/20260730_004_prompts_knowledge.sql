begin;

create extension if not exists "pg_trgm";

alter table public.prompts drop constraint if exists prompts_title_length_check;
alter table public.prompts
  add constraint prompts_title_length_check
  check (char_length(btrim(title)) between 1 and 160);

alter table public.prompts drop constraint if exists prompts_tags_limit_check;
alter table public.prompts
  add constraint prompts_tags_limit_check
  check (cardinality(tags) <= 30);

alter table public.prompt_versions drop constraint if exists prompt_versions_content_length_check;
alter table public.prompt_versions
  add constraint prompt_versions_content_length_check
  check (char_length(content) between 1 and 100000);

alter table public.prompt_versions drop constraint if exists prompt_versions_variables_array_check;
alter table public.prompt_versions
  add constraint prompt_versions_variables_array_check
  check (jsonb_typeof(variables) = 'array');

alter table public.knowledge_items drop constraint if exists knowledge_items_title_length_check;
alter table public.knowledge_items
  add constraint knowledge_items_title_length_check
  check (char_length(btrim(title)) between 1 and 200);

alter table public.knowledge_items drop constraint if exists knowledge_items_content_length_check;
alter table public.knowledge_items
  add constraint knowledge_items_content_length_check
  check (char_length(content) <= 100000);

alter table public.knowledge_items drop constraint if exists knowledge_items_tags_limit_check;
alter table public.knowledge_items
  add constraint knowledge_items_tags_limit_check
  check (cardinality(tags) <= 30);

create index if not exists prompts_project_idx
  on public.prompts (project_id);
create index if not exists prompts_user_project_idx
  on public.prompts (user_id, project_id);
create index if not exists prompts_current_version_idx
  on public.prompts (current_version_id);
create index if not exists prompt_versions_prompt_version_idx
  on public.prompt_versions (prompt_id, version desc);
create index if not exists knowledge_items_project_idx
  on public.knowledge_items (project_id);
create index if not exists knowledge_items_user_project_idx
  on public.knowledge_items (user_id, project_id);

create index if not exists prompts_search_trgm_idx
  on public.prompts using gin (
    lower(title || ' ' || description) gin_trgm_ops
  );
create index if not exists knowledge_items_search_trgm_idx
  on public.knowledge_items using gin (
    lower(title || ' ' || content) gin_trgm_ops
  );

drop policy if exists "select own rows" on public.prompts;
drop policy if exists "insert own rows" on public.prompts;
drop policy if exists "update own rows" on public.prompts;
drop policy if exists "delete own rows" on public.prompts;
create policy "select own rows" on public.prompts
  for select to authenticated
  using ((select auth.uid()) = user_id);
create policy "insert own rows" on public.prompts
  for insert to authenticated
  with check ((select auth.uid()) = user_id);
create policy "update own rows" on public.prompts
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy "delete own rows" on public.prompts
  for delete to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "select own rows" on public.prompt_versions;
drop policy if exists "insert own rows" on public.prompt_versions;
drop policy if exists "update own rows" on public.prompt_versions;
drop policy if exists "delete own rows" on public.prompt_versions;
create policy "select own rows" on public.prompt_versions
  for select to authenticated
  using ((select auth.uid()) = user_id);
create policy "insert own rows" on public.prompt_versions
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "select own rows" on public.knowledge_items;
drop policy if exists "insert own rows" on public.knowledge_items;
drop policy if exists "update own rows" on public.knowledge_items;
drop policy if exists "delete own rows" on public.knowledge_items;
create policy "select own rows" on public.knowledge_items
  for select to authenticated
  using ((select auth.uid()) = user_id);
create policy "insert own rows" on public.knowledge_items
  for insert to authenticated
  with check ((select auth.uid()) = user_id);
create policy "update own rows" on public.knowledge_items
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy "delete own rows" on public.knowledge_items
  for delete to authenticated
  using ((select auth.uid()) = user_id);

create or replace function public.publish_prompt_version(
  p_prompt_id uuid,
  p_content text,
  p_model text default '',
  p_variables jsonb default '[]'::jsonb,
  p_notes text default ''
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
set statement_timeout = '10s'
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_next_version integer;
  v_version public.prompt_versions;
begin
  if v_user_id is null then
    raise exception 'authentication required' using errcode = '42501';
  end if;
  if nullif(btrim(p_content), '') is null then
    raise exception 'prompt content is required' using errcode = '22023';
  end if;
  if jsonb_typeof(p_variables) <> 'array' then
    raise exception 'prompt variables must be a JSON array' using errcode = '22023';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(p_prompt_id::text, 0));

  if not exists (
    select 1
    from public.prompts
    where id = p_prompt_id and user_id = v_user_id
  ) then
    raise exception 'prompt not found' using errcode = 'P0002';
  end if;

  select coalesce(max(version), 0) + 1
  into v_next_version
  from public.prompt_versions
  where prompt_id = p_prompt_id and user_id = v_user_id;

  insert into public.prompt_versions (
    user_id, prompt_id, version, content, model, variables, notes
  )
  values (
    v_user_id,
    p_prompt_id,
    v_next_version,
    p_content,
    coalesce(p_model, ''),
    p_variables,
    coalesce(p_notes, '')
  )
  returning * into v_version;

  update public.prompts
  set current_version_id = v_version.id
  where id = p_prompt_id and user_id = v_user_id;

  return jsonb_build_object(
    'id', v_version.id,
    'prompt_id', v_version.prompt_id,
    'version', v_version.version,
    'content', v_version.content,
    'model', v_version.model,
    'variables', v_version.variables,
    'notes', v_version.notes,
    'created_at', v_version.created_at
  );
end;
$$;

revoke all on function public.publish_prompt_version(
  uuid, text, text, jsonb, text
) from public, anon;
grant execute on function public.publish_prompt_version(
  uuid, text, text, jsonb, text
) to authenticated;

create or replace function public.search_prompts(p_query text default '')
returns setof public.prompts
language sql
stable
security invoker
set search_path = ''
set statement_timeout = '5s'
as $$
  select prompt.*
  from public.prompts as prompt
  where prompt.user_id = (select auth.uid())
    and (
      nullif(btrim(p_query), '') is null
      or lower(prompt.title || ' ' || prompt.description)
        like '%' || lower(p_query) || '%'
      or prompt.tags @> array[btrim(p_query)]::text[]
    )
  order by prompt.updated_at desc;
$$;

create or replace function public.search_knowledge_items(p_query text default '')
returns setof public.knowledge_items
language sql
stable
security invoker
set search_path = ''
set statement_timeout = '5s'
as $$
  select item.*
  from public.knowledge_items as item
  where item.user_id = (select auth.uid())
    and item.archived_at is null
    and (
      nullif(btrim(p_query), '') is null
      or lower(item.title || ' ' || item.content)
        like '%' || lower(p_query) || '%'
      or item.tags @> array[btrim(p_query)]::text[]
    )
  order by item.updated_at desc;
$$;

revoke all on function public.search_prompts(text) from public, anon;
revoke all on function public.search_knowledge_items(text) from public, anon;
grant execute on function public.search_prompts(text) to authenticated;
grant execute on function public.search_knowledge_items(text) to authenticated;

revoke update, delete on table public.prompt_versions from anon, authenticated;
grant select, insert on table public.prompt_versions to authenticated;

commit;
