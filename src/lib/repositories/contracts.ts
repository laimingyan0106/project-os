import type {
  Agent,
  InboxItem,
  Project,
  Workflow,
  WorkflowSummary,
} from "@/lib/project-os";

export interface ProjectRepository {
  list(): Promise<Project[]>;
  get(id: string): Promise<Project | null>;
  save(project: Project): Promise<Project>;
  archive(id: string): Promise<Project>;
  remove(id: string): Promise<void>;
}

export interface InboxRepository {
  list(): Promise<InboxItem[]>;
  save(item: InboxItem): Promise<InboxItem>;
  remove(id: string): Promise<void>;
}

export interface AgentRepository {
  list(): Promise<Agent[]>;
  get(id: string): Promise<Agent | null>;
  save(agent: Agent): Promise<Agent>;
  remove(id: string): Promise<void>;
}

export interface WorkflowRepository {
  list(): Promise<WorkflowSummary[]>;
  getGraph(id: string): Promise<Workflow | null>;
  create(input: {
    title: string;
    description?: string;
    projectId?: string;
  }): Promise<WorkflowSummary>;
  saveGraph(workflow: Workflow): Promise<Workflow>;
  duplicate(id: string): Promise<WorkflowSummary>;
  remove(id: string): Promise<void>;
}

export interface CloudState {
  projects: Project[];
  inbox: InboxItem[];
  agents: Agent[];
  workflows: WorkflowSummary[];
}
