"use server";

import { z } from "zod";
import {
  actionError,
  type ActionResult,
} from "@/lib/action-result";
import type {
  Agent,
  ResourceItem,
  Skill,
  InboxItem,
  KnowledgeItem,
  Project,
  PromptAsset,
  PromptCreateInput,
  PromptVersionInput,
  Workflow,
  WorkflowSummary,
} from "@/lib/project-os";
import { containsPlaintextSecret } from "@/lib/s6";
import {
  type LocalMigrationSummary,
  normalizeLegacyV1Snapshot,
  parseLegacyV1Snapshot,
} from "@/lib/migration/v1-snapshot";
import type { CloudState } from "@/lib/repositories/contracts";
import {
  classifyRepositoryFailure,
  getRepositoryFailureDetails,
} from "@/lib/repositories/error-mapping";
import {
  createRepositories,
  loadCloudState,
  RepositoryError,
} from "@/lib/repositories/supabase-repositories";
import { createClient } from "@/lib/supabase/server";

const uuid = z.string().uuid();
const optionalText = z.string().max(10_000).optional();

const projectSchema = z.object({
  id: uuid,
  title: z.string().trim().min(1).max(160),
  goal: z.string().max(2_000),
  description: optionalText,
  status: z.enum(["planning", "active", "blocked", "done"]),
  priority: z.enum(["low", "medium", "high"]),
  workflowId: uuid.optional(),
  dueDate: z.string().date().optional(),
  archivedAt: z.string().datetime().optional(),
  updatedAt: z.string(),
});

const inboxSchema = z.object({
  id: uuid,
  title: z.string().trim().min(1).max(200),
  content: z.string().max(10_000),
  kind: z.enum(["idea", "task", "note"]),
  processed: z.boolean(),
  status: z.enum(["inbox", "processed", "archived"]).optional(),
  processedAt: z.string().datetime().optional(),
  convertedEntityType: z.string().max(40).optional(),
  convertedEntityId: uuid.optional(),
  createdAt: z.string(),
  updatedAt: z.string().optional(),
});

const agentSchema = z.object({
  id: uuid,
  name: z.string().trim().min(1).max(120),
  role: z.string().max(500),
  input: z.string().max(5_000),
  output: z.string().max(5_000),
  projectId: uuid.optional(),
  model: z.string().max(120).optional(),
  tools: z.array(z.string().trim().min(1).max(120)).max(50).optional(),
  nextAgent: uuid.optional(),
  status: z.enum(["draft", "ready", "working", "paused", "error"]),
  updatedAt: z.string().optional(),
});

const workflowCreateSchema = z.object({
  title: z.string().trim().min(1).max(160),
  description: z.string().max(2_000).optional(),
  projectId: uuid.optional(),
});

const tagsSchema = z.array(z.string().trim().min(1).max(80)).max(30);
const promptVersionInputSchema = z.object({
  content: z.string().trim().min(1).max(100_000),
  model: z.string().max(120),
  variables: z.array(z.string().trim().min(1).max(120)).max(100),
  notes: z.string().max(5_000),
});
const promptCreateSchema = z.object({
  id: uuid,
  projectId: uuid.optional(),
  title: z.string().trim().min(1).max(160),
  description: z.string().max(2_000),
  tags: tagsSchema,
  ...promptVersionInputSchema.shape,
});
const promptMetadataSchema = z.object({
  id: uuid,
  projectId: uuid.optional(),
  title: z.string().trim().min(1).max(160),
  description: z.string().max(2_000),
  tags: tagsSchema,
  currentVersionId: uuid.optional(),
  currentVersion: z.any().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
const knowledgeSchema = z.object({
  id: uuid,
  projectId: uuid.optional(),
  title: z.string().trim().min(1).max(200),
  content: z.string().max(100_000),
  type: z.enum(["note", "decision", "lesson", "reference"]),
  tags: tagsSchema,
  sourceUrl: z.string().url().max(2_000).optional(),
  archivedAt: z.string().datetime().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
const skillSchema = z.object({
  id: uuid,
  name: z.string().trim().min(1).max(160),
  parentId: uuid.optional(),
  level: z.number().int().min(1).max(100),
  experience: z.number().int().nonnegative(),
  description: z.string().max(5_000),
  createdAt: z.string(),
  updatedAt: z.string(),
}).refine((skill) => skill.parentId !== skill.id, {
  message: "技能不能将自己设为父级。",
  path: ["parentId"],
});
const skillExperienceSchema = z.object({
  skillId: uuid,
  projectId: uuid.optional(),
  delta: z.number().int().min(-100_000).max(100_000).refine((value) => value !== 0),
  reason: z.string().trim().min(1).max(500),
});
const metadataSchema = z.record(
  z.string().trim().min(1).max(80),
  z.string().max(1_000),
);
const resourceSchema = z.object({
  id: uuid,
  projectId: uuid.optional(),
  name: z.string().trim().min(1).max(200),
  type: z.enum(["link", "document", "api", "tool", "account", "other"]),
  url: z.string().url().max(2_000).optional(),
  notes: z.string().max(10_000),
  secretRef: z.string().max(500).optional(),
  metadata: metadataSchema,
  createdAt: z.string(),
  updatedAt: z.string(),
});

const workflowNodeSchema = z.object({
  id: uuid,
  position: z.object({
    x: z.number().finite(),
    y: z.number().finite(),
  }),
  data: z.object({
    label: z.string().trim().min(1).max(200),
    kind: z.enum(["trigger", "agent", "review", "condition", "output"]),
    owner: z.string().max(160),
  }).passthrough(),
}).passthrough();

const workflowEdgeSchema = z.object({
  id: uuid,
  source: uuid,
  target: uuid,
  label: z.string().max(200).optional(),
  animated: z.boolean().optional(),
}).passthrough();

const workflowGraphSchema = z.object({
  id: uuid,
  title: z.string().trim().min(1).max(160),
  description: z.string().max(2_000),
  projectId: uuid.optional(),
  version: z.number().int().positive(),
  isDefault: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
  nodes: z.array(workflowNodeSchema).max(500),
  edges: z.array(workflowEdgeSchema).max(1_000),
}).superRefine((workflow, context) => {
  const nodeIds = new Set(workflow.nodes.map((node) => node.id));
  if (nodeIds.size !== workflow.nodes.length) {
    context.addIssue({
      code: "custom",
      message: "工作流包含重复节点。",
      path: ["nodes"],
    });
  }
  for (const [index, edge] of workflow.edges.entries()) {
    if (!nodeIds.has(edge.source) || !nodeIds.has(edge.target)) {
      context.addIssue({
        code: "custom",
        message: "连线引用了不存在的节点。",
        path: ["edges", index],
      });
    }
  }
});

const migrationSummarySchema = z.object({
  projects: z.number().int().nonnegative(),
  agents: z.number().int().nonnegative(),
  inbox: z.number().int().nonnegative(),
  workflows: z.number().int().nonnegative(),
  nodes: z.number().int().nonnegative(),
  edges: z.number().int().nonnegative(),
  conflictCopies: z.number().int().nonnegative(),
  alreadyImported: z.boolean(),
  completedAt: z.string(),
});

function repositoryFailure<T>(
  reason: unknown,
  operation = "cloudAction",
): ActionResult<T> {
  const kind = classifyRepositoryFailure(reason);
  const details = getRepositoryFailureDetails(reason);

  console.error("[project-os] repository operation failed", {
    operation,
    kind,
    code: details.code ?? "unknown",
    name: details.name ?? "unknown",
    message: details.message.slice(0, 300),
  });

  if (kind === "forbidden") {
    return actionError("FORBIDDEN", "没有权限访问这条数据。");
  }
  if (kind === "conflict") {
    return actionError("CONFLICT", "数据已发生变化，请载入云端最新版。");
  }
  if (kind === "validation") {
    return actionError("VALIDATION_ERROR", "工作流节点或连线数据无效。");
  }
  if (kind === "network") {
    return actionError("NETWORK_ERROR", "网络连接失败，草稿尚未保存。");
  }
  return actionError("UNKNOWN_ERROR", "云端操作失败，请稍后重试。");
}

async function authenticatedRepositories() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  return {
    supabase,
    repositories: createRepositories(supabase, user.id),
    userId: user.id,
  };
}

export async function getLocalMigrationStatusAction(): Promise<
  ActionResult<LocalMigrationSummary | null>
> {
  const context = await authenticatedRepositories();
  if (!context) return actionError("AUTH_REQUIRED", "登录已过期，请重新登录。");

  const { data, error } = await context.supabase
    .from("migration_runs")
    .select("summary")
    .eq("user_id", context.userId)
    .eq("source", "project-os")
    .eq("source_version", "v1")
    .eq("status", "success")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    return repositoryFailure(
      new RepositoryError(error.message, error.code),
      "getLocalMigrationStatus",
    );
  }
  if (!data) return { ok: true, data: null };

  const parsed = migrationSummarySchema.safeParse(data.summary);
  if (!parsed.success) {
    return actionError("UNKNOWN_ERROR", "云端迁移记录格式异常，请稍后重试。");
  }
  return { ok: true, data: parsed.data };
}

export async function importLegacyV1SnapshotAction(
  sourceJson: string,
  allowSeedImport = false,
): Promise<ActionResult<LocalMigrationSummary>> {
  if (sourceJson.length > 5_500_000) {
    return actionError("VALIDATION_ERROR", "本地快照超过 5.5 MB，无法安全导入。");
  }

  const parsed = parseLegacyV1Snapshot(sourceJson);
  if (!parsed.ok) {
    return actionError("VALIDATION_ERROR", parsed.message);
  }
  if (parsed.isSeedEquivalent && !allowSeedImport) {
    return actionError(
      "VALIDATION_ERROR",
      "检测到这是未修改的示例数据，请明确确认后再导入。",
      { seedConfirmationRequired: true },
    );
  }

  const context = await authenticatedRepositories();
  if (!context) return actionError("AUTH_REQUIRED", "登录已过期，请重新登录。");

  const normalized = normalizeLegacyV1Snapshot(parsed.snapshot);
  const { data, error } = await context.supabase.rpc("import_v1_snapshot", {
    p_snapshot: normalized,
  });

  if (error) {
    const details = getRepositoryFailureDetails(error);
    await context.supabase.from("migration_runs").insert({
      user_id: context.userId,
      source: "project-os",
      source_version: "v1",
      status: "failed",
      summary: {
        projects: normalized.projects.length,
        agents: normalized.agents.length,
        inbox: normalized.inbox.length,
        workflows: 1,
        nodes: normalized.workflow.nodes.length,
        edges: normalized.workflow.edges.length,
      },
      error: details.message.slice(0, 500),
    });
    return repositoryFailure(
      new RepositoryError(error.message, error.code),
      "importLegacyV1Snapshot",
    );
  }

  const summary = migrationSummarySchema.safeParse(data);
  if (!summary.success) {
    return actionError("UNKNOWN_ERROR", "云端返回了无法识别的迁移结果。");
  }
  return { ok: true, data: summary.data };
}

export async function refreshCloudStateAction(): Promise<ActionResult<CloudState>> {
  const context = await authenticatedRepositories();
  if (!context) return actionError("AUTH_REQUIRED", "登录已过期，请重新登录。");
  try {
    return {
      ok: true,
      data: await loadCloudState(context.supabase, context.userId),
    };
  } catch (reason) {
    return repositoryFailure(reason);
  }
}

export async function saveProjectAction(input: Project): Promise<ActionResult<Project>> {
  const parsed = projectSchema.safeParse(input);
  if (!parsed.success) {
    return actionError("VALIDATION_ERROR", "请检查项目名称、状态和日期。");
  }
  const context = await authenticatedRepositories();
  if (!context) return actionError("AUTH_REQUIRED", "登录已过期，请重新登录。");
  try {
    return { ok: true, data: await context.repositories.projects.save(parsed.data) };
  } catch (reason) {
    return repositoryFailure(reason);
  }
}

export async function archiveProjectAction(id: string): Promise<ActionResult<Project>> {
  const parsed = uuid.safeParse(id);
  if (!parsed.success) return actionError("VALIDATION_ERROR", "项目编号无效。");
  const context = await authenticatedRepositories();
  if (!context) return actionError("AUTH_REQUIRED", "登录已过期，请重新登录。");
  try {
    return { ok: true, data: await context.repositories.projects.archive(parsed.data) };
  } catch (reason) {
    return repositoryFailure(reason);
  }
}

export async function removeProjectAction(id: string): Promise<ActionResult<null>> {
  const parsed = uuid.safeParse(id);
  if (!parsed.success) return actionError("VALIDATION_ERROR", "项目编号无效。");
  const context = await authenticatedRepositories();
  if (!context) return actionError("AUTH_REQUIRED", "登录已过期，请重新登录。");
  try {
    await context.repositories.projects.remove(parsed.data);
    return { ok: true, data: null };
  } catch (reason) {
    return repositoryFailure(reason);
  }
}

export async function saveInboxItemAction(input: InboxItem): Promise<ActionResult<InboxItem>> {
  const parsed = inboxSchema.safeParse(input);
  if (!parsed.success) {
    return actionError("VALIDATION_ERROR", "请检查收集项标题和内容。");
  }
  const context = await authenticatedRepositories();
  if (!context) return actionError("AUTH_REQUIRED", "登录已过期，请重新登录。");
  try {
    return { ok: true, data: await context.repositories.inbox.save(parsed.data) };
  } catch (reason) {
    return repositoryFailure(reason);
  }
}

export async function removeInboxItemAction(id: string): Promise<ActionResult<null>> {
  const parsed = uuid.safeParse(id);
  if (!parsed.success) return actionError("VALIDATION_ERROR", "收集项编号无效。");
  const context = await authenticatedRepositories();
  if (!context) return actionError("AUTH_REQUIRED", "登录已过期，请重新登录。");
  try {
    await context.repositories.inbox.remove(parsed.data);
    return { ok: true, data: null };
  } catch (reason) {
    return repositoryFailure(reason);
  }
}

export async function saveAgentAction(input: Agent): Promise<ActionResult<Agent>> {
  const parsed = agentSchema.safeParse(input);
  if (!parsed.success) {
    return actionError("VALIDATION_ERROR", "请检查 Agent 名称、状态和工具列表。");
  }
  const context = await authenticatedRepositories();
  if (!context) return actionError("AUTH_REQUIRED", "登录已过期，请重新登录。");
  try {
    return { ok: true, data: await context.repositories.agents.save(parsed.data) };
  } catch (reason) {
    return repositoryFailure(reason);
  }
}

export async function removeAgentAction(id: string): Promise<ActionResult<null>> {
  const parsed = uuid.safeParse(id);
  if (!parsed.success) return actionError("VALIDATION_ERROR", "Agent 编号无效。");
  const context = await authenticatedRepositories();
  if (!context) return actionError("AUTH_REQUIRED", "登录已过期，请重新登录。");
  try {
    await context.repositories.agents.remove(parsed.data);
    return { ok: true, data: null };
  } catch (reason) {
    return repositoryFailure(reason);
  }
}

export async function createWorkflowAction(
  input: {
    title: string;
    description?: string;
    projectId?: string;
  },
): Promise<ActionResult<WorkflowSummary>> {
  const parsed = workflowCreateSchema.safeParse(input);
  if (!parsed.success) {
    return actionError("VALIDATION_ERROR", "请检查工作流名称和关联项目。");
  }
  const context = await authenticatedRepositories();
  if (!context) return actionError("AUTH_REQUIRED", "登录已过期，请重新登录。");
  try {
    return {
      ok: true,
      data: await context.repositories.workflows.create(parsed.data),
    };
  } catch (reason) {
    return repositoryFailure(reason);
  }
}

export async function saveWorkflowGraphAction(
  input: Workflow,
): Promise<ActionResult<Workflow>> {
  if (!workflowGraphSchema.safeParse(input).success) {
    return actionError("VALIDATION_ERROR", "请检查工作流节点和连线。");
  }
  const context = await authenticatedRepositories();
  if (!context) return actionError("AUTH_REQUIRED", "登录已过期，请重新登录。");
  try {
    return {
      ok: true,
      data: await context.repositories.workflows.saveGraph(input),
    };
  } catch (reason) {
    return repositoryFailure(reason, "saveWorkflowGraph");
  }
}

export async function duplicateWorkflowAction(
  id: string,
): Promise<ActionResult<WorkflowSummary>> {
  const parsed = uuid.safeParse(id);
  if (!parsed.success) {
    return actionError("VALIDATION_ERROR", "工作流编号无效。");
  }
  const context = await authenticatedRepositories();
  if (!context) return actionError("AUTH_REQUIRED", "登录已过期，请重新登录。");
  try {
    return {
      ok: true,
      data: await context.repositories.workflows.duplicate(parsed.data),
    };
  } catch (reason) {
    return repositoryFailure(reason);
  }
}

export async function removeWorkflowAction(
  id: string,
): Promise<ActionResult<null>> {
  const parsed = uuid.safeParse(id);
  if (!parsed.success) {
    return actionError("VALIDATION_ERROR", "工作流编号无效。");
  }
  const context = await authenticatedRepositories();
  if (!context) return actionError("AUTH_REQUIRED", "登录已过期，请重新登录。");
  try {
    await context.repositories.workflows.remove(parsed.data);
    return { ok: true, data: null };
  } catch (reason) {
    return repositoryFailure(reason);
  }
}

export async function createPromptAction(
  input: PromptCreateInput,
): Promise<ActionResult<PromptAsset>> {
  const parsed = promptCreateSchema.safeParse(input);
  if (!parsed.success) {
    return actionError("VALIDATION_ERROR", "请检查 Prompt 标题、正文、标签和变量。");
  }
  const context = await authenticatedRepositories();
  if (!context) return actionError("AUTH_REQUIRED", "登录已过期，请重新登录。");

  try {
    const prompt = await context.repositories.prompts.create({
      id: parsed.data.id,
      projectId: parsed.data.projectId,
      title: parsed.data.title,
      description: parsed.data.description,
      tags: parsed.data.tags,
    });
    try {
      await context.repositories.prompts.createVersion(prompt.id, {
        content: parsed.data.content,
        model: parsed.data.model,
        variables: parsed.data.variables,
        notes: parsed.data.notes,
      });
    } catch (reason) {
      await context.repositories.prompts.remove(prompt.id);
      throw reason;
    }
    const created = await context.repositories.prompts.get(prompt.id);
    if (!created) throw new RepositoryError("prompt not found after create", "P0002");
    return { ok: true, data: created };
  } catch (reason) {
    return repositoryFailure(reason, "createPrompt");
  }
}

export async function updatePromptMetadataAction(
  input: PromptAsset,
): Promise<ActionResult<PromptAsset>> {
  const parsed = promptMetadataSchema.safeParse(input);
  if (!parsed.success) {
    return actionError("VALIDATION_ERROR", "请检查 Prompt 标题、描述和标签。");
  }
  const context = await authenticatedRepositories();
  if (!context) return actionError("AUTH_REQUIRED", "登录已过期，请重新登录。");
  try {
    return {
      ok: true,
      data: await context.repositories.prompts.updateMetadata(
        parsed.data as PromptAsset,
      ),
    };
  } catch (reason) {
    return repositoryFailure(reason, "updatePromptMetadata");
  }
}

export async function publishPromptVersionAction(
  promptId: string,
  input: PromptVersionInput,
): Promise<ActionResult<PromptAsset>> {
  const parsedId = uuid.safeParse(promptId);
  const parsed = promptVersionInputSchema.safeParse(input);
  if (!parsedId.success || !parsed.success) {
    return actionError("VALIDATION_ERROR", "请检查 Prompt 正文、模型、变量和备注。");
  }
  const context = await authenticatedRepositories();
  if (!context) return actionError("AUTH_REQUIRED", "登录已过期，请重新登录。");
  try {
    await context.repositories.prompts.createVersion(parsedId.data, parsed.data);
    const prompt = await context.repositories.prompts.get(parsedId.data);
    if (!prompt) throw new RepositoryError("prompt not found after publish", "P0002");
    return { ok: true, data: prompt };
  } catch (reason) {
    return repositoryFailure(reason, "publishPromptVersion");
  }
}

export async function removePromptAction(id: string): Promise<ActionResult<null>> {
  const parsed = uuid.safeParse(id);
  if (!parsed.success) return actionError("VALIDATION_ERROR", "Prompt 编号无效。");
  const context = await authenticatedRepositories();
  if (!context) return actionError("AUTH_REQUIRED", "登录已过期，请重新登录。");
  try {
    await context.repositories.prompts.remove(parsed.data);
    return { ok: true, data: null };
  } catch (reason) {
    return repositoryFailure(reason, "removePrompt");
  }
}

export async function saveKnowledgeAction(
  input: KnowledgeItem,
): Promise<ActionResult<KnowledgeItem>> {
  const parsed = knowledgeSchema.safeParse(input);
  if (!parsed.success) {
    return actionError("VALIDATION_ERROR", "请检查知识条目的标题、正文、类型和来源链接。");
  }
  const context = await authenticatedRepositories();
  if (!context) return actionError("AUTH_REQUIRED", "登录已过期，请重新登录。");
  try {
    return {
      ok: true,
      data: await context.repositories.knowledge.save(parsed.data),
    };
  } catch (reason) {
    return repositoryFailure(reason, "saveKnowledge");
  }
}

export async function archiveKnowledgeAction(
  id: string,
): Promise<ActionResult<KnowledgeItem>> {
  const parsed = uuid.safeParse(id);
  if (!parsed.success) return actionError("VALIDATION_ERROR", "知识条目编号无效。");
  const context = await authenticatedRepositories();
  if (!context) return actionError("AUTH_REQUIRED", "登录已过期，请重新登录。");
  try {
    return {
      ok: true,
      data: await context.repositories.knowledge.archive(parsed.data),
    };
  } catch (reason) {
    return repositoryFailure(reason, "archiveKnowledge");
  }
}

export async function removeKnowledgeAction(
  id: string,
): Promise<ActionResult<null>> {
  const parsed = uuid.safeParse(id);
  if (!parsed.success) return actionError("VALIDATION_ERROR", "知识条目编号无效。");
  const context = await authenticatedRepositories();
  if (!context) return actionError("AUTH_REQUIRED", "登录已过期，请重新登录。");
  try {
    await context.repositories.knowledge.remove(parsed.data);
    return { ok: true, data: null };
  } catch (reason) {
    return repositoryFailure(reason, "removeKnowledge");
  }
}

export async function saveSkillAction(
  input: Skill,
): Promise<ActionResult<Skill>> {
  const parsed = skillSchema.safeParse(input);
  if (!parsed.success) {
    return actionError("VALIDATION_ERROR", "请检查技能名称、等级和父级关系。");
  }
  const context = await authenticatedRepositories();
  if (!context) return actionError("AUTH_REQUIRED", "登录已过期，请重新登录。");
  try {
    return {
      ok: true,
      data: await context.repositories.skills.save(parsed.data),
    };
  } catch (reason) {
    return repositoryFailure(reason, "saveSkill");
  }
}

export async function addSkillExperienceAction(input: {
  skillId: string;
  projectId?: string;
  delta: number;
  reason: string;
}): Promise<ActionResult<{ skill: Skill; event: import("@/lib/project-os").SkillEvent }>> {
  const parsed = skillExperienceSchema.safeParse(input);
  if (!parsed.success) {
    return actionError("VALIDATION_ERROR", "经验变化不能为 0，并且必须填写原因。");
  }
  const context = await authenticatedRepositories();
  if (!context) return actionError("AUTH_REQUIRED", "登录已过期，请重新登录。");
  try {
    return {
      ok: true,
      data: await context.repositories.skills.addExperience(parsed.data),
    };
  } catch (reason) {
    return repositoryFailure(reason, "addSkillExperience");
  }
}

export async function removeSkillAction(
  id: string,
): Promise<ActionResult<null>> {
  const parsed = uuid.safeParse(id);
  if (!parsed.success) return actionError("VALIDATION_ERROR", "技能编号无效。");
  const context = await authenticatedRepositories();
  if (!context) return actionError("AUTH_REQUIRED", "登录已过期，请重新登录。");
  try {
    await context.repositories.skills.remove(parsed.data);
    return { ok: true, data: null };
  } catch (reason) {
    return repositoryFailure(reason, "removeSkill");
  }
}

export async function saveResourceAction(
  input: ResourceItem,
): Promise<ActionResult<ResourceItem>> {
  const parsed = resourceSchema.safeParse(input);
  if (!parsed.success) {
    return actionError("VALIDATION_ERROR", "请检查资源名称、类型、URL 和元数据。");
  }
  const searchable = [
    parsed.data.notes,
    parsed.data.url ?? "",
    ...Object.entries(parsed.data.metadata).flat(),
  ].join("\n");
  if (containsPlaintextSecret(searchable)) {
    return actionError(
      "VALIDATION_ERROR",
      "检测到疑似明文密钥。请删除密钥，仅在 Secret Ref 中填写密钥名称或托管位置。",
    );
  }
  const context = await authenticatedRepositories();
  if (!context) return actionError("AUTH_REQUIRED", "登录已过期，请重新登录。");
  try {
    return {
      ok: true,
      data: await context.repositories.resources.save(parsed.data),
    };
  } catch (reason) {
    return repositoryFailure(reason, "saveResource");
  }
}

export async function removeResourceAction(
  id: string,
): Promise<ActionResult<null>> {
  const parsed = uuid.safeParse(id);
  if (!parsed.success) return actionError("VALIDATION_ERROR", "资源编号无效。");
  const context = await authenticatedRepositories();
  if (!context) return actionError("AUTH_REQUIRED", "登录已过期，请重新登录。");
  try {
    await context.repositories.resources.remove(parsed.data);
    return { ok: true, data: null };
  } catch (reason) {
    return repositoryFailure(reason, "removeResource");
  }
}
