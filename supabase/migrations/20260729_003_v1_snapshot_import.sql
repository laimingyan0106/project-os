begin;

create or replace function public.import_v1_snapshot(
  p_snapshot jsonb
)
returns jsonb
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_existing_summary jsonb;
  v_run_id uuid;
  v_item jsonb;
  v_old_id text;
  v_target_id uuid;
  v_workflow_id uuid;
  v_project_map jsonb := '{}'::jsonb;
  v_agent_map jsonb := '{}'::jsonb;
  v_node_map jsonb := '{}'::jsonb;
  v_conflicts integer := 0;
  v_summary jsonb;
begin
  if v_user_id is null then
    raise exception using
      errcode = '42501',
      message = 'authentication required';
  end if;

  perform set_config('statement_timeout', '60s', true);

  if jsonb_typeof(p_snapshot) is distinct from 'object'
     or jsonb_typeof(p_snapshot->'projects') is distinct from 'array'
     or jsonb_typeof(p_snapshot->'agents') is distinct from 'array'
     or jsonb_typeof(p_snapshot->'inbox') is distinct from 'array'
     or jsonb_typeof(p_snapshot->'workflow') is distinct from 'object'
     or jsonb_typeof(p_snapshot->'workflow'->'nodes') is distinct from 'array'
     or jsonb_typeof(p_snapshot->'workflow'->'edges') is distinct from 'array' then
    raise exception using
      errcode = '22023',
      message = 'invalid project-os:v1 snapshot';
  end if;

  perform pg_advisory_xact_lock(
    hashtextextended(v_user_id::text || ':project-os:v1', 0)
  );

  select migration_run.summary
  into v_existing_summary
  from public.migration_runs as migration_run
  where migration_run.user_id = v_user_id
    and migration_run.source = 'project-os'
    and migration_run.source_version = 'v1'
    and migration_run.status = 'success'
  order by migration_run.created_at desc
  limit 1;

  if v_existing_summary is not null then
    return v_existing_summary || jsonb_build_object('alreadyImported', true);
  end if;

  insert into public.migration_runs (
    user_id,
    source,
    source_version,
    status,
    summary
  )
  values (
    v_user_id,
    'project-os',
    'v1',
    'running',
    '{}'::jsonb
  )
  returning id into v_run_id;

  for v_item in
    select value from jsonb_array_elements(p_snapshot->'projects')
  loop
    v_old_id := v_item->>'id';
    v_target_id := v_old_id::uuid;
    if exists (
      select 1 from public.projects
      where id = v_target_id and user_id = v_user_id
    ) then
      v_target_id := gen_random_uuid();
      v_conflicts := v_conflicts + 1;
    end if;
    v_project_map := v_project_map
      || jsonb_build_object(v_old_id, v_target_id::text);

    insert into public.projects (
      id,
      user_id,
      title,
      goal,
      description,
      status,
      priority,
      updated_at
    )
    values (
      v_target_id,
      v_user_id,
      v_item->>'title',
      coalesce(v_item->>'goal', ''),
      coalesce(v_item->>'description', ''),
      v_item->>'status',
      v_item->>'priority',
      coalesce((v_item->>'updatedAt')::timestamptz, now())
    );
  end loop;

  v_old_id := p_snapshot->'workflow'->>'id';
  v_workflow_id := v_old_id::uuid;
  if exists (
    select 1 from public.workflows
    where id = v_workflow_id and user_id = v_user_id
  ) then
    v_workflow_id := gen_random_uuid();
    v_conflicts := v_conflicts + 1;
  end if;

  insert into public.workflows (
    id,
    user_id,
    project_id,
    title,
    description,
    version,
    is_default,
    nodes,
    edges
  )
  values (
    v_workflow_id,
    v_user_id,
    case
      when p_snapshot->'workflow'->>'projectId' is null then null
      else (v_project_map->>(p_snapshot->'workflow'->>'projectId'))::uuid
    end,
    p_snapshot->'workflow'->>'title',
    '',
    1,
    not exists (
      select 1 from public.workflows
      where user_id = v_user_id and is_default
    ),
    p_snapshot->'workflow'->'nodes',
    p_snapshot->'workflow'->'edges'
  );

  for v_item in
    select value from jsonb_array_elements(p_snapshot->'workflow'->'nodes')
  loop
    v_old_id := v_item->>'id';
    v_target_id := v_old_id::uuid;
    if exists (select 1 from public.workflow_nodes where id = v_target_id) then
      v_target_id := gen_random_uuid();
      v_conflicts := v_conflicts + 1;
    end if;
    v_node_map := v_node_map || jsonb_build_object(v_old_id, v_target_id::text);

    insert into public.workflow_nodes (
      id,
      user_id,
      workflow_id,
      type,
      label,
      owner,
      position_x,
      position_y,
      config
    )
    values (
      v_target_id,
      v_user_id,
      v_workflow_id,
      v_item->'data'->>'kind',
      v_item->'data'->>'label',
      coalesce(v_item->'data'->>'owner', ''),
      coalesce((v_item->'position'->>'x')::double precision, 0),
      coalesce((v_item->'position'->>'y')::double precision, 0),
      '{}'::jsonb
    );
  end loop;

  for v_item in
    select value from jsonb_array_elements(p_snapshot->'workflow'->'edges')
  loop
    v_target_id := (v_item->>'id')::uuid;
    if exists (select 1 from public.workflow_edges where id = v_target_id) then
      v_target_id := gen_random_uuid();
      v_conflicts := v_conflicts + 1;
    end if;

    insert into public.workflow_edges (
      id,
      user_id,
      workflow_id,
      source_node_id,
      target_node_id,
      label,
      animated,
      config
    )
    values (
      v_target_id,
      v_user_id,
      v_workflow_id,
      (v_node_map->>(v_item->>'source'))::uuid,
      (v_node_map->>(v_item->>'target'))::uuid,
      coalesce(v_item->>'label', ''),
      coalesce((v_item->>'animated')::boolean, false),
      '{}'::jsonb
    );
  end loop;

  for v_item in
    select value from jsonb_array_elements(p_snapshot->'agents')
  loop
    v_old_id := v_item->>'id';
    v_target_id := v_old_id::uuid;
    if exists (
      select 1 from public.agents
      where id = v_target_id and user_id = v_user_id
    ) then
      v_target_id := gen_random_uuid();
      v_conflicts := v_conflicts + 1;
    end if;
    v_agent_map := v_agent_map || jsonb_build_object(v_old_id, v_target_id::text);

    insert into public.agents (
      id,
      user_id,
      name,
      role,
      input,
      output,
      input_schema,
      output_schema,
      status
    )
    values (
      v_target_id,
      v_user_id,
      v_item->>'name',
      coalesce(v_item->>'role', ''),
      coalesce(v_item->>'input', ''),
      coalesce(v_item->>'output', ''),
      coalesce(v_item->>'input', ''),
      coalesce(v_item->>'output', ''),
      v_item->>'status'
    );
  end loop;

  for v_item in
    select value from jsonb_array_elements(p_snapshot->'agents')
    where value->>'nextAgent' is not null
  loop
    update public.agents
    set next_agent_id = (v_agent_map->>(v_item->>'nextAgent'))::uuid
    where id = (v_agent_map->>(v_item->>'id'))::uuid
      and user_id = v_user_id;
  end loop;

  for v_item in
    select value from jsonb_array_elements(p_snapshot->'inbox')
  loop
    v_target_id := (v_item->>'id')::uuid;
    if exists (
      select 1 from public.inbox_items
      where id = v_target_id and user_id = v_user_id
    ) then
      v_target_id := gen_random_uuid();
      v_conflicts := v_conflicts + 1;
    end if;

    insert into public.inbox_items (
      id,
      user_id,
      title,
      content,
      kind,
      processed,
      status,
      processed_at,
      created_at,
      updated_at
    )
    values (
      v_target_id,
      v_user_id,
      v_item->>'title',
      coalesce(v_item->>'content', ''),
      v_item->>'kind',
      coalesce((v_item->>'processed')::boolean, false),
      case
        when coalesce((v_item->>'processed')::boolean, false)
          then 'processed'
        else 'inbox'
      end,
      case
        when coalesce((v_item->>'processed')::boolean, false)
          then now()
        else null
      end,
      coalesce((v_item->>'createdAt')::timestamptz, now()),
      now()
    );
  end loop;

  for v_item in
    select value
    from jsonb_array_elements(p_snapshot->'projects')
    where value->>'workflowId' = p_snapshot->'workflow'->>'id'
  loop
    update public.projects
    set workflow_id = v_workflow_id
    where id = (v_project_map->>(v_item->>'id'))::uuid
      and user_id = v_user_id;
  end loop;

  v_summary := jsonb_build_object(
    'projects', jsonb_array_length(p_snapshot->'projects'),
    'agents', jsonb_array_length(p_snapshot->'agents'),
    'inbox', jsonb_array_length(p_snapshot->'inbox'),
    'workflows', 1,
    'nodes', jsonb_array_length(p_snapshot->'workflow'->'nodes'),
    'edges', jsonb_array_length(p_snapshot->'workflow'->'edges'),
    'conflictCopies', v_conflicts,
    'alreadyImported', false,
    'completedAt', now()
  );

  update public.migration_runs
  set status = 'success', summary = v_summary, error = null
  where id = v_run_id and user_id = v_user_id;

  return v_summary;
end;
$$;

revoke all on function public.import_v1_snapshot(jsonb)
  from public, anon;
grant execute on function public.import_v1_snapshot(jsonb)
  to authenticated;

commit;
