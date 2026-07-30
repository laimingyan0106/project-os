begin;

create or replace function public.delete_all_workspace_data(
  p_confirmation text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_summary jsonb;
begin
  if v_user_id is null then
    raise exception 'authentication required' using errcode = '42501';
  end if;
  if p_confirmation is distinct from 'DELETE DATA' then
    raise exception 'invalid confirmation' using errcode = '22023';
  end if;

  select jsonb_build_object(
    'projects', (select count(*) from public.projects where user_id = v_user_id),
    'workflows', (select count(*) from public.workflows where user_id = v_user_id),
    'agents', (select count(*) from public.agents where user_id = v_user_id),
    'inbox', (select count(*) from public.inbox_items where user_id = v_user_id),
    'prompts', (select count(*) from public.prompts where user_id = v_user_id),
    'knowledge', (select count(*) from public.knowledge_items where user_id = v_user_id),
    'skills', (select count(*) from public.skills where user_id = v_user_id),
    'resources', (select count(*) from public.resources where user_id = v_user_id)
  ) into v_summary;

  delete from public.inbox_items where user_id = v_user_id;
  delete from public.agents where user_id = v_user_id;
  delete from public.workflows where user_id = v_user_id;
  delete from public.prompts where user_id = v_user_id;
  delete from public.knowledge_items where user_id = v_user_id;
  delete from public.skills where user_id = v_user_id;
  delete from public.resources where user_id = v_user_id;
  delete from public.projects where user_id = v_user_id;
  delete from public.migration_runs where user_id = v_user_id;
  delete from public.activity_logs where user_id = v_user_id;

  return v_summary || jsonb_build_object('completed_at', now());
end;
$$;

revoke all on function public.delete_all_workspace_data(text) from public;
grant execute on function public.delete_all_workspace_data(text) to authenticated;

create or replace function public.delete_own_account(
  p_confirmation text
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_issued_at timestamptz;
begin
  if v_user_id is null then
    raise exception 'authentication required' using errcode = '42501';
  end if;
  if p_confirmation is distinct from 'DELETE' then
    raise exception 'invalid confirmation' using errcode = '22023';
  end if;

  begin
    v_issued_at := to_timestamp((auth.jwt() ->> 'iat')::double precision);
  exception when others then
    raise exception 'recent authentication required' using errcode = '42501';
  end;
  if v_issued_at < now() - interval '5 minutes' then
    raise exception 'recent authentication required' using errcode = '42501';
  end if;

  delete from auth.users where id = v_user_id;
  if not found then
    raise exception 'account not found' using errcode = 'P0002';
  end if;

  return true;
end;
$$;

revoke all on function public.delete_own_account(text) from public;
grant execute on function public.delete_own_account(text) to authenticated;

commit;
