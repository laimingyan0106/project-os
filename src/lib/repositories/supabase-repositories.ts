import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Agent, InboxItem, Project } from "@/lib/project-os";
import type {
  AgentRepository,
  CloudState,
  InboxRepository,
  ProjectRepository,
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

export function createRepositories(client: SupabaseClient, userId: string) {
  return {
    projects: new SupabaseProjectRepository(client, userId),
    inbox: new SupabaseInboxRepository(client, userId),
    agents: new SupabaseAgentRepository(client, userId),
  };
}

export async function loadCloudState(
  client: SupabaseClient,
  userId: string,
): Promise<CloudState> {
  const repositories = createRepositories(client, userId);
  const [projects, inbox, agents] = await Promise.all([
    repositories.projects.list(),
    repositories.inbox.list(),
    repositories.agents.list(),
  ]);
  return { projects, inbox, agents };
}
