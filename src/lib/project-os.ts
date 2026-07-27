import type { Edge, Node } from "@xyflow/react";

export type ProjectStatus = "active" | "planning" | "blocked" | "done";
export type Priority = "high" | "medium" | "low";

export interface Project {
  id: string;
  title: string;
  goal: string;
  status: ProjectStatus;
  priority: Priority;
  workflowId?: string;
  updatedAt: string;
}

export interface Agent {
  id: string;
  name: string;
  role: string;
  input: string;
  output: string;
  nextAgent?: string;
  status: "ready" | "working" | "draft";
}

export interface InboxItem {
  id: string;
  title: string;
  content: string;
  kind: "idea" | "task" | "note";
  processed: boolean;
  createdAt: string;
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
