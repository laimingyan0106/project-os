import type { Edge, Node } from "@xyflow/react";

export type ProjectStatus = "active" | "planning" | "blocked" | "done";
export type Priority = "high" | "medium" | "low";

export interface Project {
  id: string;
  title: string;
  goal: string;
  description?: string;
  status: ProjectStatus;
  priority: Priority;
  workflowId?: string;
  dueDate?: string;
  archivedAt?: string;
  updatedAt: string;
}

export interface Agent {
  id: string;
  name: string;
  role: string;
  input: string;
  output: string;
  projectId?: string;
  model?: string;
  tools?: string[];
  nextAgent?: string;
  status: "ready" | "working" | "draft" | "paused" | "error";
  updatedAt?: string;
}

export interface InboxItem {
  id: string;
  title: string;
  content: string;
  kind: "idea" | "task" | "note";
  processed: boolean;
  status?: "inbox" | "processed" | "archived";
  processedAt?: string;
  convertedEntityType?: string;
  convertedEntityId?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface WorkflowNodeData extends Record<string, unknown> {
  label: string;
  kind: "trigger" | "agent" | "review" | "condition" | "output";
  owner: string;
}

export interface WorkflowSummary {
  id: string;
  title: string;
  description: string;
  projectId?: string;
  version: number;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Workflow extends WorkflowSummary {
  nodes: Node<WorkflowNodeData>[];
  edges: Edge[];
}

export interface ProjectOSState {
  projects: Project[];
  agents: Agent[];
  inbox: InboxItem[];
  workflow: Workflow;
}

export interface PromptVersion {
  id: string;
  promptId: string;
  version: number;
  content: string;
  model: string;
  variables: string[];
  notes: string;
  createdAt: string;
}

export interface PromptAsset {
  id: string;
  projectId?: string;
  title: string;
  description: string;
  tags: string[];
  currentVersionId?: string;
  currentVersion?: PromptVersion;
  createdAt: string;
  updatedAt: string;
}

export interface PromptCreateInput {
  id: string;
  projectId?: string;
  title: string;
  description: string;
  tags: string[];
  content: string;
  model: string;
  variables: string[];
  notes: string;
}

export type PromptVersionInput = Pick<
  PromptVersion,
  "content" | "model" | "variables" | "notes"
>;

export type KnowledgeType = "note" | "decision" | "lesson" | "reference";

export interface KnowledgeItem {
  id: string;
  projectId?: string;
  title: string;
  content: string;
  type: KnowledgeType;
  tags: string[];
  sourceUrl?: string;
  archivedAt?: string;
  createdAt: string;
  updatedAt: string;
}
