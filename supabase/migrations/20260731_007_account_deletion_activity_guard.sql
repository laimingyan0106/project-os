begin;

create or replace function public.capture_project_os_activity()
returns trigger
language plpgsql
security definer
set search_path = ''
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
  -- Account deletion cascades through every workspace table. Do not create new
  -- activity rows while that cascade is removing the activity owner.
  if current_setting('project_os.suppress_activity', true) = 'on' then
    if tg_op = 'DELETE' then return old; end if;
    return new;
  end if;

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

  perform set_config('project_os.suppress_activity', 'on', true);
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
