import type { Agent, InboxItem, Project } from "@/lib/project-os";

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

export interface CloudState {
  projects: Project[];
  inbox: InboxItem[];
  agents: Agent[];
}
