import type {
  Agent,
  ActivityLog,
  InboxItem,
  KnowledgeItem,
  Project,
  PromptAsset,
  PromptVersion,
  ResourceItem,
  Skill,
  SkillEvent,
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

export interface PromptRepository {
  list(query?: string): Promise<PromptAsset[]>;
  get(id: string): Promise<PromptAsset | null>;
  create(input: Omit<PromptAsset, "currentVersionId" | "currentVersion" | "createdAt" | "updatedAt">): Promise<PromptAsset>;
  updateMetadata(prompt: PromptAsset): Promise<PromptAsset>;
  createVersion(
    promptId: string,
    input: Pick<PromptVersion, "content" | "model" | "variables" | "notes">,
  ): Promise<PromptVersion>;
  remove(id: string): Promise<void>;
}

export interface KnowledgeRepository {
  list(query?: string): Promise<KnowledgeItem[]>;
  get(id: string): Promise<KnowledgeItem | null>;
  save(item: KnowledgeItem): Promise<KnowledgeItem>;
  archive(id: string): Promise<KnowledgeItem>;
  remove(id: string): Promise<void>;
}

export interface SkillRepository {
  getTree(): Promise<Skill[]>;
  listEvents(): Promise<SkillEvent[]>;
  save(skill: Skill): Promise<Skill>;
  addExperience(input: {
    skillId: string;
    projectId?: string;
    delta: number;
    reason: string;
  }): Promise<{ skill: Skill; event: SkillEvent }>;
  remove(id: string): Promise<void>;
}

export interface ResourceRepository {
  list(): Promise<ResourceItem[]>;
  save(resource: ResourceItem): Promise<ResourceItem>;
  remove(id: string): Promise<void>;
}

export interface ActivityRepository {
  list(limit?: number): Promise<ActivityLog[]>;
}

export interface CloudState {
  projects: Project[];
  inbox: InboxItem[];
  agents: Agent[];
  workflows: WorkflowSummary[];
  prompts: PromptAsset[];
  knowledge: KnowledgeItem[];
  skills: Skill[];
  skillEvents: SkillEvent[];
  resources: ResourceItem[];
  activities: ActivityLog[];
}
