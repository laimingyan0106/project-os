import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  Agent,
  InboxItem,
  Project,
  Workflow,
  WorkflowSummary,
} from "@/lib/project-os";
import type {
  AgentRepository,
  CloudState,
  InboxRepository,
  ProjectRepository,
  WorkflowRepository,
} from "@/lib/repositories/contracts";

type Row = Record<string, unknown>;

export class RepositoryError extends Error {
  constructor(
    message: string,
    readonly code?: string,
  ) {
    super(message);
    this.name = "RepositoryError";
  }
}

function assertNoError(error: { message: string; code?: string } | null) {
  if (error) throw new RepositoryError(error.message, error.code);
}

function projectFromRow(row: Row): Project {
  return {
    id: String(row.id),
    title: String(row.title ?? ""),
    goal: String(row.goal ?? ""),
    description: String(row.description ?? ""),
    status: row.status as Project["status"],
    priority: row.priority as Project["priority"],
    workflowId: row.workflow_id ? String(row.workflow_id) : undefined,
    dueDate: row.due_date ? String(row.due_date) : undefined,
    archivedAt: row.archived_at ? String(row.archived_at) : undefined,
    updatedAt: String(row.updated_at ?? ""),
  };
}

function inboxFromRow(row: Row): InboxItem {
  const status = String(row.status ?? (row.processed ? "processed" : "inbox"));
  return {
    id: String(row.id),
    title: String(row.title ?? ""),
    content: String(row.content ?? ""),
    kind: row.kind as InboxItem["kind"],
    processed: status === "processed",
    status: status as InboxItem["status"],
    processedAt: row.processed_at ? String(row.processed_at) : undefined,
    convertedEntityType: row.converted_entity_type
      ? String(row.converted_entity_type)
      : undefined,
    convertedEntityId: row.converted_entity_id
      ? String(row.converted_entity_id)
      : undefined,
    createdAt: String(row.created_at ?? ""),
    updatedAt: String(row.updated_at ?? ""),
  };
}

function agentFromRow(row: Row): Agent {
  const tools = Array.isArray(row.tools) ? row.tools.map(String) : [];
  return {
    id: String(row.id),
    name: String(row.name ?? ""),
    role: String(row.role ?? ""),
    input: String(row.input_schema ?? row.input ?? ""),
    output: String(row.output_schema ?? row.output ?? ""),
    projectId: row.project_id ? String(row.project_id) : undefined,
    model: String(row.model ?? ""),
    tools,
    nextAgent: row.next_agent_id ? String(row.next_agent_id) : undefined,
    status: row.status as Agent["status"],
    updatedAt: String(row.updated_at ?? ""),
  };
}

function jsonObject(value: unknown): Row {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Row
    : {};
}

function workflowSummaryFromRow(row: Row): WorkflowSummary {
  return {
    id: String(row.id),
    title: String(row.title ?? ""),
    description: String(row.description ?? ""),
    projectId: row.project_id ? String(row.project_id) : undefined,
    version: Number(row.version ?? 1),
    isDefault: Boolean(row.is_default),
    createdAt: String(row.created_at ?? ""),
    updatedAt: String(row.updated_at ?? ""),
  };
}

function workflowNodeFromRow(row: Row): Workflow["nodes"][number] {
  const config = jsonObject(row.config);
  const nodeConfig = jsonObject(config.node);
  const dataConfig = jsonObject(config.data);
  return {
    ...nodeConfig,
    id: String(row.id),
    position: {
      x: Number(row.position_x ?? 0),
      y: Number(row.position_y ?? 0),
    },
    data: {
      ...dataConfig,
      label: String(row.label ?? ""),
      kind: row.type as Workflow["nodes"][number]["data"]["kind"],
      owner: String(row.owner ?? ""),
    },
  };
}

function workflowEdgeFromRow(row: Row): Workflow["edges"][number] {
  const config = jsonObject(row.config);
  return {
    ...jsonObject(config.edge),
    id: String(row.id),
    source: String(row.source_node_id),
    target: String(row.target_node_id),
    label: String(row.label ?? "") || undefined,
    animated: Boolean(row.animated),
  };
}

function workflowNodeToRow(node: Workflow["nodes"][number]) {
  const { id, position, data, ...nodeConfig } = node;
  const { label, kind, owner, ...dataConfig } = data;
  return {
    id,
    type: kind,
    label,
    owner,
    position_x: position.x,
    position_y: position.y,
    config: { node: nodeConfig, data: dataConfig },
  };
}

function workflowEdgeToRow(edge: Workflow["edges"][number]) {
  const {
    id,
    source,
    target,
    label,
    animated,
    ...edgeConfig
  } = edge;
  return {
    id,
    source_node_id: source,
    target_node_id: target,
    label: typeof label === "string" ? label : "",
    animated: Boolean(animated),
    config: { edge: edgeConfig },
  };
}

class SupabaseProjectRepository implements ProjectRepository {
  constructor(
    private readonly client: SupabaseClient,
    private readonly userId: string,
  ) {}

  async list() {
    const { data, error } = await this.client
      .from("projects")
      .select("*")
      .eq("user_id", this.userId)
      .is("archived_at", null)
      .order("updated_at", { ascending: false });
    assertNoError(error);
    return (data ?? []).map((row) => projectFromRow(row as Row));
  }

  async get(id: string) {
    const { data, error } = await this.client
      .from("projects")
      .select("*")
      .eq("user_id", this.userId)
      .eq("id", id)
      .maybeSingle();
    assertNoError(error);
    return data ? projectFromRow(data as Row) : null;
  }

  async save(project: Project) {
    const { data, error } = await this.client
      .from("projects")
      .upsert({
        id: project.id,
        user_id: this.userId,
        title: project.title,
        goal: project.goal,
        description: project.description ?? "",
        status: project.status,
        priority: project.priority,
        workflow_id: project.workflowId ?? null,
        due_date: project.dueDate ?? null,
        archived_at: project.archivedAt ?? null,
      })
      .select()
      .single();
    assertNoError(error);
    return projectFromRow(data as Row);
  }

  async archive(id: string) {
    const { data, error } = await this.client
      .from("projects")
      .update({ archived_at: new Date().toISOString() })
      .eq("user_id", this.userId)
      .eq("id", id)
      .select()
      .single();
    assertNoError(error);
    return projectFromRow(data as Row);
  }

  async remove(id: string) {
    const { error } = await this.client
      .from("projects")
      .delete()
      .eq("user_id", this.userId)
      .eq("id", id);
    assertNoError(error);
  }
}

class SupabaseInboxRepository implements InboxRepository {
  constructor(
    private readonly client: SupabaseClient,
    private readonly userId: string,
  ) {}

  async list() {
    const { data, error } = await this.client
      .from("inbox_items")
      .select("*")
      .eq("user_id", this.userId)
      .neq("status", "archived")
      .order("updated_at", { ascending: false });
    assertNoError(error);
    return (data ?? []).map((row) => inboxFromRow(row as Row));
  }

  async save(item: InboxItem) {
    const status = item.processed ? "processed" : "inbox";
    const { data, error } = await this.client
      .from("inbox_items")
      .upsert({
        id: item.id,
        user_id: this.userId,
        title: item.title,
        content: item.content,
        kind: item.kind,
        processed: item.processed,
        status,
        processed_at: item.processed
          ? (item.processedAt ?? new Date().toISOString())
          : null,
        converted_entity_type: item.convertedEntityType ?? null,
        converted_entity_id: item.convertedEntityId ?? null,
      })
      .select()
      .single();
    assertNoError(error);
    return inboxFromRow(data as Row);
  }

  async remove(id: string) {
    const { error } = await this.client
      .from("inbox_items")
      .delete()
      .eq("user_id", this.userId)
      .eq("id", id);
    assertNoError(error);
  }
}

class SupabaseAgentRepository implements AgentRepository {
  constructor(
    private readonly client: SupabaseClient,
    private readonly userId: string,
  ) {}

  async list() {
    const { data, error } = await this.client
      .from("agents")
      .select("*")
      .eq("user_id", this.userId)
      .order("updated_at", { ascending: false });
    assertNoError(error);
    return (data ?? []).map((row) => agentFromRow(row as Row));
  }

  async get(id: string) {
    const { data, error } = await this.client
      .from("agents")
      .select("*")
      .eq("user_id", this.userId)
      .eq("id", id)
      .maybeSingle();
    assertNoError(error);
    return data ? agentFromRow(data as Row) : null;
  }

  async save(agent: Agent) {
    const { data, error } = await this.client
      .from("agents")
      .upsert({
        id: agent.id,
        user_id: this.userId,
        project_id: agent.projectId ?? null,
        name: agent.name,
        role: agent.role,
        input: agent.input,
        output: agent.output,
        input_schema: agent.input,
        output_schema: agent.output,
        status: agent.status,
        model: agent.model ?? "",
        tools: agent.tools ?? [],
        next_agent_id: agent.nextAgent ?? null,
      })
      .select()
      .single();
    assertNoError(error);
    return agentFromRow(data as Row);
  }

  async remove(id: string) {
    const { error } = await this.client
      .from("agents")
      .delete()
      .eq("user_id", this.userId)
      .eq("id", id);
    assertNoError(error);
  }
}

class SupabaseWorkflowRepository implements WorkflowRepository {
  constructor(
    private readonly client: SupabaseClient,
    private readonly userId: string,
  ) {}

  async list() {
    const { data, error } = await this.client
      .from("workflows")
      .select("id,project_id,title,description,version,is_default,created_at,updated_at")
      .eq("user_id", this.userId)
      .order("updated_at", { ascending: false });
    assertNoError(error);
    return (data ?? []).map((row) => workflowSummaryFromRow(row as Row));
  }

  async getGraph(id: string) {
    const { data, error } = await this.client
      .from("workflows")
      .select("id,project_id,title,description,version,is_default,created_at,updated_at")
      .eq("user_id", this.userId)
      .eq("id", id)
      .maybeSingle();
    assertNoError(error);
    if (!data) return null;

    const [nodeResult, edgeResult] = await Promise.all([
      this.client
        .from("workflow_nodes")
        .select("*")
        .eq("user_id", this.userId)
        .eq("workflow_id", id)
        .order("created_at", { ascending: true }),
      this.client
        .from("workflow_edges")
        .select("*")
        .eq("user_id", this.userId)
        .eq("workflow_id", id)
        .order("created_at", { ascending: true }),
    ]);
    assertNoError(nodeResult.error);
    assertNoError(edgeResult.error);

    return {
      ...workflowSummaryFromRow(data as Row),
      nodes: (nodeResult.data ?? []).map((row) => workflowNodeFromRow(row as Row)),
      edges: (edgeResult.data ?? []).map((row) => workflowEdgeFromRow(row as Row)),
    };
  }

  async create(input: {
    title: string;
    description?: string;
    projectId?: string;
  }) {
    const { count, error: countError } = await this.client
      .from("workflows")
      .select("id", { count: "exact", head: true })
      .eq("user_id", this.userId);
    assertNoError(countError);

    const { data, error } = await this.client
      .from("workflows")
      .insert({
        user_id: this.userId,
        project_id: input.projectId ?? null,
        title: input.title,
        description: input.description ?? "",
        is_default: count === 0,
      })
      .select("id,project_id,title,description,version,is_default,created_at,updated_at")
      .single();
    assertNoError(error);
    return workflowSummaryFromRow(data as Row);
  }

  async saveGraph(workflow: Workflow) {
    const { data, error } = await this.client
      .rpc("save_workflow_graph", {
        p_workflow_id: workflow.id,
        p_expected_version: workflow.version,
        p_nodes: workflow.nodes.map(workflowNodeToRow),
        p_edges: workflow.edges.map(workflowEdgeToRow),
      })
      .single();
    assertNoError(error);
    return {
      ...workflowSummaryFromRow(data as Row),
      nodes: workflow.nodes,
      edges: workflow.edges,
    };
  }

  async duplicate(id: string) {
    const source = await this.getGraph(id);
    if (!source) throw new RepositoryError("workflow not found", "P0002");
    const copy = await this.create({
      title: `${source.title} 副本`,
      description: source.description,
      projectId: source.projectId,
    });
    try {
      const nodeIds = new Map(
        source.nodes.map((node) => [node.id, crypto.randomUUID()]),
      );
      const saved = await this.saveGraph({
        ...source,
        ...copy,
        nodes: source.nodes.map((node) => ({
          ...node,
          id: nodeIds.get(node.id) ?? crypto.randomUUID(),
        })),
        edges: source.edges.map((edge) => ({
          ...edge,
          id: crypto.randomUUID(),
          source: nodeIds.get(edge.source) ?? edge.source,
          target: nodeIds.get(edge.target) ?? edge.target,
        })),
      });
      return {
        id: saved.id,
        title: saved.title,
        description: saved.description,
        projectId: saved.projectId,
        version: saved.version,
        isDefault: saved.isDefault,
        createdAt: saved.createdAt,
        updatedAt: saved.updatedAt,
      };
    } catch (reason) {
      await this.remove(copy.id);
      throw reason;
    }
  }

  async remove(id: string) {
    const { error } = await this.client
      .from("workflows")
      .delete()
      .eq("user_id", this.userId)
      .eq("id", id);
    assertNoError(error);
  }
}

export function createRepositories(client: SupabaseClient, userId: string) {
  return {
    projects: new SupabaseProjectRepository(client, userId),
    inbox: new SupabaseInboxRepository(client, userId),
    agents: new SupabaseAgentRepository(client, userId),
    workflows: new SupabaseWorkflowRepository(client, userId),
  };
}

export async function loadCloudState(
  client: SupabaseClient,
  userId: string,
): Promise<CloudState> {
  const repositories = createRepositories(client, userId);
  const [projects, inbox, agents, workflows] = await Promise.all([
    repositories.projects.list(),
    repositories.inbox.list(),
    repositories.agents.list(),
    repositories.workflows.list(),
  ]);
  return { projects, inbox, agents, workflows };
}
