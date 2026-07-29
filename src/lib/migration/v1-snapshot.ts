import { z } from "zod";
import { seedState } from "@/lib/seed-data";

export const V1_STORAGE_KEY = "project-os:v1";
export const V1_BACKUP_KEY = "project-os:v1:migrated-backup";
export const V1_BACKUP_RETENTION_MS = 30 * 24 * 60 * 60 * 1_000;

const uuid = z.string().uuid();
const legacyId = z.string().trim().min(1).max(200);
const optionalText = z.string().max(10_000).optional();

const legacyProjectSchema = z.object({
  id: legacyId,
  title: z.string().trim().min(1).max(160),
  goal: z.string().max(2_000),
  description: optionalText,
  status: z.enum(["planning", "active", "blocked", "done"]),
  priority: z.enum(["low", "medium", "high"]),
  workflowId: legacyId.optional(),
  updatedAt: z.string().max(100),
}).passthrough();

const legacyAgentSchema = z.object({
  id: legacyId,
  name: z.string().trim().min(1).max(120),
  role: z.string().max(500),
  input: z.string().max(5_000),
  output: z.string().max(5_000),
  nextAgent: legacyId.optional(),
  status: z.enum(["draft", "ready", "working"]),
}).passthrough();

const legacyInboxSchema = z.object({
  id: legacyId,
  title: z.string().trim().min(1).max(200),
  content: z.string().max(10_000),
  kind: z.enum(["idea", "task", "note"]),
  processed: z.boolean(),
  createdAt: z.string().max(100),
}).passthrough();

const legacyNodeSchema = z.object({
  id: legacyId,
  position: z.object({
    x: z.number().finite(),
    y: z.number().finite(),
  }),
  data: z.object({
    label: z.string().trim().min(1).max(200),
    kind: z.enum(["trigger", "agent", "review", "output"]),
    owner: z.string().max(160),
  }).passthrough(),
}).passthrough();

const legacyEdgeSchema = z.object({
  id: legacyId,
  source: legacyId,
  target: legacyId,
  label: z.string().max(200).optional(),
  animated: z.boolean().optional(),
}).passthrough();

const legacyWorkflowSchema = z.object({
  id: legacyId,
  title: z.string().trim().min(1).max(160),
  nodes: z.array(legacyNodeSchema).max(500),
  edges: z.array(legacyEdgeSchema).max(1_000),
}).passthrough();

export const legacyV1SnapshotSchema = z.object({
  projects: z.array(legacyProjectSchema).max(500),
  agents: z.array(legacyAgentSchema).max(500),
  inbox: z.array(legacyInboxSchema).max(2_000),
  workflow: legacyWorkflowSchema,
}).superRefine((snapshot, context) => {
  const checkUnique = (
    items: Array<{ id: string }>,
    path: Array<string | number>,
    label: string,
  ) => {
    if (new Set(items.map((item) => item.id)).size !== items.length) {
      context.addIssue({
        code: "custom",
        message: `${label}包含重复编号。`,
        path,
      });
    }
  };

  checkUnique(snapshot.projects, ["projects"], "项目");
  checkUnique(snapshot.agents, ["agents"], "Agent");
  checkUnique(snapshot.inbox, ["inbox"], "Inbox");
  checkUnique(snapshot.workflow.nodes, ["workflow", "nodes"], "工作流节点");
  checkUnique(snapshot.workflow.edges, ["workflow", "edges"], "工作流连线");

  const nodeIds = new Set(snapshot.workflow.nodes.map((node) => node.id));
  for (const [index, edge] of snapshot.workflow.edges.entries()) {
    if (!nodeIds.has(edge.source) || !nodeIds.has(edge.target)) {
      context.addIssue({
        code: "custom",
        message: "工作流连线引用了不存在的节点。",
        path: ["workflow", "edges", index],
      });
    }
  }
});

export type LegacyV1Snapshot = z.infer<typeof legacyV1SnapshotSchema>;

export interface NormalizedV1Snapshot {
  projects: Array<{
    id: string;
    title: string;
    goal: string;
    description: string;
    status: LegacyV1Snapshot["projects"][number]["status"];
    priority: LegacyV1Snapshot["projects"][number]["priority"];
    workflowId?: string;
    updatedAt: string;
  }>;
  agents: Array<{
    id: string;
    name: string;
    role: string;
    input: string;
    output: string;
    nextAgent?: string;
    status: LegacyV1Snapshot["agents"][number]["status"];
  }>;
  inbox: Array<{
    id: string;
    title: string;
    content: string;
    kind: LegacyV1Snapshot["inbox"][number]["kind"];
    processed: boolean;
    createdAt: string;
  }>;
  workflow: {
    id: string;
    projectId?: string;
    title: string;
    nodes: Array<{
      id: string;
      position: { x: number; y: number };
      data: {
        label: string;
        kind: LegacyV1Snapshot["workflow"]["nodes"][number]["data"]["kind"];
        owner: string;
      };
    }>;
    edges: Array<{
      id: string;
      source: string;
      target: string;
      label?: string;
      animated?: boolean;
    }>;
  };
}

export interface LocalMigrationSummary {
  projects: number;
  agents: number;
  inbox: number;
  workflows: number;
  nodes: number;
  edges: number;
  conflictCopies: number;
  alreadyImported: boolean;
  completedAt: string;
}

export interface V1BackupRecord {
  source: typeof V1_STORAGE_KEY;
  snapshot: string;
  migratedAt: string;
  expiresAt: string;
}

export function createV1BackupRecord(
  snapshot: string,
  migratedAt = new Date(),
): V1BackupRecord {
  return {
    source: V1_STORAGE_KEY,
    snapshot,
    migratedAt: migratedAt.toISOString(),
    expiresAt: new Date(
      migratedAt.getTime() + V1_BACKUP_RETENTION_MS,
    ).toISOString(),
  };
}

export function isV1BackupExpired(
  backup: Pick<V1BackupRecord, "expiresAt">,
  now = Date.now(),
) {
  const expiresAt = Date.parse(backup.expiresAt);
  return Number.isNaN(expiresAt) || expiresAt <= now;
}

export type LegacySnapshotParseResult =
  | {
      ok: true;
      snapshot: LegacyV1Snapshot;
      sourceJson: string;
      isSeedEquivalent: boolean;
    }
  | {
      ok: false;
      message: string;
    };

function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map(canonicalJson).join(",")}]`;
  }
  if (value && typeof value === "object") {
    return `{${Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, item]) => `${JSON.stringify(key)}:${canonicalJson(item)}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

const legacySeedSnapshot = legacyV1SnapshotSchema.parse({
  projects: seedState.projects,
  agents: seedState.agents,
  inbox: seedState.inbox,
  workflow: {
    id: seedState.workflow.id,
    title: seedState.workflow.title,
    nodes: seedState.workflow.nodes,
    edges: seedState.workflow.edges,
  },
});

export function parseLegacyV1Snapshot(
  source: string | unknown,
): LegacySnapshotParseResult {
  let value: unknown = source;
  if (typeof source === "string") {
    try {
      value = JSON.parse(source);
    } catch {
      return { ok: false, message: "JSON 格式无效，无法读取 v0.1 数据。" };
    }
  }

  const parsed = legacyV1SnapshotSchema.safeParse(value);
  if (!parsed.success) {
    return {
      ok: false,
      message: parsed.error.issues[0]?.message ?? "数据不符合 Project OS v0.1 格式。",
    };
  }

  return {
    ok: true,
    snapshot: parsed.data,
    sourceJson: typeof source === "string"
      ? source
      : JSON.stringify(source),
    isSeedEquivalent: canonicalJson(parsed.data) === canonicalJson(legacySeedSnapshot),
  };
}

function isoOrFallback(value: string, fallback: string) {
  const timestamp = Date.parse(value);
  return Number.isNaN(timestamp) ? fallback : new Date(timestamp).toISOString();
}

export function normalizeLegacyV1Snapshot(
  snapshot: LegacyV1Snapshot,
  options?: {
    now?: string;
    createId?: () => string;
  },
): NormalizedV1Snapshot {
  const now = options?.now ?? new Date().toISOString();
  const createId = options?.createId ?? (() => crypto.randomUUID());

  const mapIds = (ids: string[]) => {
    const mapped = new Map<string, string>();
    for (const id of ids) {
      mapped.set(id, uuid.safeParse(id).success ? id : createId());
    }
    return mapped;
  };

  const workflowIds = mapIds([snapshot.workflow.id]);
  const projectIds = mapIds(snapshot.projects.map((project) => project.id));
  const agentIds = mapIds(snapshot.agents.map((agent) => agent.id));
  const inboxIds = mapIds(snapshot.inbox.map((item) => item.id));
  const nodeIds = mapIds(snapshot.workflow.nodes.map((node) => node.id));
  const edgeIds = mapIds(snapshot.workflow.edges.map((edge) => edge.id));
  const workflowId = workflowIds.get(snapshot.workflow.id)!;
  const linkedProject = snapshot.projects.find(
    (project) => project.workflowId === snapshot.workflow.id,
  );

  return {
    projects: snapshot.projects.map((project) => ({
      id: projectIds.get(project.id)!,
      title: project.title,
      goal: project.goal,
      description: project.description ?? "",
      status: project.status,
      priority: project.priority,
      workflowId: project.workflowId === snapshot.workflow.id
        ? workflowId
        : undefined,
      updatedAt: isoOrFallback(project.updatedAt, now),
    })),
    agents: snapshot.agents.map((agent) => ({
      id: agentIds.get(agent.id)!,
      name: agent.name,
      role: agent.role,
      input: agent.input,
      output: agent.output,
      nextAgent: agent.nextAgent ? agentIds.get(agent.nextAgent) : undefined,
      status: agent.status,
    })),
    inbox: snapshot.inbox.map((item) => ({
      id: inboxIds.get(item.id)!,
      title: item.title,
      content: item.content,
      kind: item.kind,
      processed: item.processed,
      createdAt: isoOrFallback(item.createdAt, now),
    })),
    workflow: {
      id: workflowId,
      projectId: linkedProject ? projectIds.get(linkedProject.id) : undefined,
      title: snapshot.workflow.title,
      nodes: snapshot.workflow.nodes.map((node) => ({
        id: nodeIds.get(node.id)!,
        position: node.position,
        data: {
          label: node.data.label,
          kind: node.data.kind,
          owner: node.data.owner,
        },
      })),
      edges: snapshot.workflow.edges.map((edge) => ({
        id: edgeIds.get(edge.id)!,
        source: nodeIds.get(edge.source)!,
        target: nodeIds.get(edge.target)!,
        label: edge.label,
        animated: edge.animated,
      })),
    },
  };
}
