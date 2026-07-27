"use client";

import { createContext, useContext, useEffect, useState } from "react";
import type { Agent, InboxItem, Project, ProjectOSState, Workflow } from "@/lib/project-os";
import { seedState } from "@/lib/seed-data";

interface StoreContextValue extends ProjectOSState {
  hydrated: boolean;
  saveProject: (project: Project) => void;
  deleteProject: (id: string) => void;
  saveAgent: (agent: Agent) => void;
  deleteAgent: (id: string) => void;
  saveInboxItem: (item: InboxItem) => void;
  deleteInboxItem: (id: string) => void;
  saveWorkflow: (workflow: Workflow) => void;
}

const StoreContext = createContext<StoreContextValue | null>(null);
const STORAGE_KEY = "project-os:v1";

export function ProjectOSProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<ProjectOSState>(seedState);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved) {
      // Reading persisted browser state is the external-system synchronization this effect owns.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      try { setState(JSON.parse(saved) as ProjectOSState); } catch { window.localStorage.removeItem(STORAGE_KEY); }
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (hydrated) window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [hydrated, state]);

  const upsert = <T extends { id: string }>(items: T[], item: T) =>
    items.some((current) => current.id === item.id)
      ? items.map((current) => current.id === item.id ? item : current)
      : [item, ...items];

  return (
    <StoreContext.Provider value={{
      ...state,
      hydrated,
      saveProject: (project) => setState((s) => ({ ...s, projects: upsert(s.projects, project) })),
      deleteProject: (id) => setState((s) => ({ ...s, projects: s.projects.filter((item) => item.id !== id) })),
      saveAgent: (agent) => setState((s) => ({ ...s, agents: upsert(s.agents, agent) })),
      deleteAgent: (id) => setState((s) => ({ ...s, agents: s.agents.filter((item) => item.id !== id) })),
      saveInboxItem: (item) => setState((s) => ({ ...s, inbox: upsert(s.inbox, item) })),
      deleteInboxItem: (id) => setState((s) => ({ ...s, inbox: s.inbox.filter((item) => item.id !== id) })),
      saveWorkflow: (workflow) => setState((s) => ({ ...s, workflow })),
    }}>
      {children}
    </StoreContext.Provider>
  );
}

export function useProjectOS() {
  const store = useContext(StoreContext);
  if (!store) throw new Error("useProjectOS must be used inside ProjectOSProvider");
  return store;
}
