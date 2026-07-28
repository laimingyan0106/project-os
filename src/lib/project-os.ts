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
  kind: "trigger" | "agent" | "review" | "output";
  owner: string;
}

export interface Workflow {
  id: string;
  title: string;
  nodes: Node<WorkflowNodeData>[];
  edges: Edge[];
}

export interface ProjectOSState {
  projects: Project[];
  agents: Agent[];
  inbox: InboxItem[];
  workflow: Workflow;
}
