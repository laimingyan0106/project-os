"use server";

import { z } from "zod";
import {
  actionError,
  type ActionResult,
} from "@/lib/action-result";
import type { Agent, InboxItem, Project } from "@/lib/project-os";
import type { CloudState } from "@/lib/repositories/contracts";
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

function repositoryFailure<T>(reason: unknown): ActionResult<T> {
  if (reason instanceof RepositoryError) {
    if (reason.code === "42501") {
      return actionError("FORBIDDEN", "没有权限访问这条数据。");
    }
    if (reason.code === "23505" || reason.code === "409") {
      return actionError("CONFLICT", "数据已发生变化，请刷新后重试。");
    }
    if (/fetch|network/i.test(reason.message)) {
      return actionError("NETWORK_ERROR", "网络连接失败，草稿尚未保存。");
    }
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
