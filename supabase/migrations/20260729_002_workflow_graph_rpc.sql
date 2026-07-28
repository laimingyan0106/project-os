begin;

create unique index if not exists workflows_one_default_per_user
  on public.workflows (user_id)
  where is_default;

create or replace function public.save_workflow_graph(
  p_workflow_id uuid,
  p_expected_version integer,
  p_nodes jsonb,
  p_edges jsonb
)
returns table (
  id uuid,
  user_id uuid,
  project_id uuid,
  title text,
  description text,
  version integer,
  is_default boolean,
  created_at timestamptz,
  updated_at timestamptz
)
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_current_version integer;
begin
  if v_user_id is null then
    raise exception using
      errcode = '42501',
      message = 'authentication required';
  end if;

  if jsonb_typeof(p_nodes) is distinct from 'array'
     or jsonb_typeof(p_edges) is distinct from 'array' then
    raise exception using
      errcode = '22023',
      message = 'workflow graph must contain node and edge arrays';
  end if;

  select w.version
  into v_current_version
  from public.workflows as w
  where w.id = p_workflow_id
    and w.user_id = v_user_id
  for update;

  if not found then
    raise exception using
      errcode = 'P0002',
      message = 'workflow not found';
  end if;

  if v_current_version <> p_expected_version then
    raise exception using
      errcode = '40001',
      message = 'workflow version conflict';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(p_edges) as edge
    where not exists (
      select 1
      from jsonb_array_elements(p_nodes) as node
      where node->>'id' = edge->>'source_node_id'
    )
    or not exists (
      select 1
      from jsonb_array_elements(p_nodes) as node
      where node->>'id' = edge->>'target_node_id'
    )
  ) then
    raise exception using
      errcode = '23503',
      message = 'workflow edge references a missing node';
  end if;

  delete from public.workflow_edges as workflow_edge
  where workflow_edge.workflow_id = p_workflow_id
    and workflow_edge.user_id = v_user_id;

  delete from public.workflow_nodes as workflow_node
  where workflow_node.workflow_id = p_workflow_id
    and workflow_node.user_id = v_user_id;

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
  select
    (node->>'id')::uuid,
    v_user_id,
    p_workflow_id,
    node->>'type',
    node->>'label',
    coalesce(node->>'owner', ''),
    coalesce((node->>'position_x')::double precision, 0),
    coalesce((node->>'position_y')::double precision, 0),
    coalesce(node->'config', '{}'::jsonb)
  from jsonb_array_elements(p_nodes) as node
  order by node->>'id';

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
  select
    (edge->>'id')::uuid,
    v_user_id,
    p_workflow_id,
    (edge->>'source_node_id')::uuid,
    (edge->>'target_node_id')::uuid,
    coalesce(edge->>'label', ''),
    coalesce((edge->>'animated')::boolean, false),
    coalesce(edge->'config', '{}'::jsonb)
  from jsonb_array_elements(p_edges) as edge
  order by edge->>'id';

  update public.workflows as w
  set
    version = w.version + 1,
    nodes = p_nodes,
    edges = p_edges,
    updated_at = now()
  where w.id = p_workflow_id
    and w.user_id = v_user_id;

  return query
  select
    w.id,
    w.user_id,
    w.project_id,
    w.title,
    w.description,
    w.version,
    w.is_default,
    w.created_at,
    w.updated_at
  from public.workflows as w
  where w.id = p_workflow_id
    and w.user_id = v_user_id;
end;
$$;

revoke all on function public.save_workflow_graph(uuid, integer, jsonb, jsonb)
  from public, anon;
grant execute on function public.save_workflow_graph(uuid, integer, jsonb, jsonb)
  to authenticated;

commit;
