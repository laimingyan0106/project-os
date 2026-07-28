"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  archiveProjectAction,
  refreshCloudStateAction,
  removeAgentAction,
  removeInboxItemAction,
  removeProjectAction,
  saveAgentAction,
  saveInboxItemAction,
  saveProjectAction,
} from "@/app/(workspace)/cloud-actions";
import {
  actionError,
  type ActionResult,
} from "@/lib/action-result";
import type { Agent, InboxItem, Project, Workflow } from "@/lib/project-os";
import type { CloudState } from "@/lib/repositories/contracts";
import { seedState } from "@/lib/seed-data";

export type SyncStatus = "synced" | "syncing" | "offline" | "error";

interface StoreContextValue extends CloudState {
  workflow: Workflow;
  hydrated: boolean;
  syncStatus: SyncStatus;
  syncError?: string;
  lastSyncedAt?: string;
  refreshCloudState: () => Promise<ActionResult<CloudState>>;
  saveProject: (project: Project) => Promise<ActionResult<Project>>;
  deleteProject: (id: string) => Promise<ActionResult<Project>>;
  removeProject: (id: string) => Promise<ActionResult<null>>;
  saveAgent: (agent: Agent) => Promise<ActionResult<Agent>>;
  deleteAgent: (id: string) => Promise<ActionResult<null>>;
  saveInboxItem: (item: InboxItem) => Promise<ActionResult<InboxItem>>;
  deleteInboxItem: (id: string) => Promise<ActionResult<null>>;
  saveWorkflow: (workflow: Workflow) => void;
}

const StoreContext = createContext<StoreContextValue | null>(null);

function upsert<T extends { id: string }>(items: T[], item: T) {
  return items.some((current) => current.id === item.id)
    ? items.map((current) => current.id === item.id ? item : current)
    : [item, ...items];
}

export function ProjectOSProvider({
  children,
  initialCloudState,
  initialCloudError,
}: {
  children: React.ReactNode;
  initialCloudState: CloudState;
  initialCloudError?: string;
}) {
  const [cloud, setCloud] = useState<CloudState>(initialCloudState);
  const [workflow, setWorkflow] = useState(seedState.workflow);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>(
    initialCloudError ? "error" : "synced",
  );
  const [syncError, setSyncError] = useState(initialCloudError);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | undefined>(
    initialCloudError ? undefined : new Date().toISOString(),
  );

  const beginCloudOperation = useCallback(() => {
    if (!navigator.onLine) {
      setSyncStatus("offline");
      setSyncError("当前处于离线状态，云端数据尚未更改。");
      return false;
    }
    setSyncStatus("syncing");
    setSyncError(undefined);
    return true;
  }, []);

  const finishCloudOperation = useCallback((result: ActionResult<unknown>) => {
    if (result.ok) {
      setSyncStatus("synced");
      setSyncError(undefined);
      setLastSyncedAt(new Date().toISOString());
    } else {
      setSyncStatus(result.error.code === "NETWORK_ERROR" ? "offline" : "error");
      setSyncError(result.error.message);
    }
  }, []);

  const refreshCloudState = useCallback(async (): Promise<ActionResult<CloudState>> => {
    if (!beginCloudOperation()) {
      return actionError("NETWORK_ERROR", "当前处于离线状态，无法刷新云端数据。");
    }
    const result = await refreshCloudStateAction();
    if (result.ok) setCloud(result.data);
    finishCloudOperation(result);
    return result;
  }, [beginCloudOperation, finishCloudOperation]);

  useEffect(() => {
    const handleFocus = () => {
      void refreshCloudState();
    };
    const handleOnline = () => {
      void refreshCloudState();
    };
    const handleOffline = () => {
      setSyncStatus("offline");
      setSyncError("当前处于离线状态，显示的是最近一次同步数据。");
    };
    window.addEventListener("focus", handleFocus);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("focus", handleFocus);
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [refreshCloudState]);

  const saveProject = useCallback(async (project: Project) => {
    if (!beginCloudOperation()) {
      return actionError("NETWORK_ERROR", "当前处于离线状态，项目尚未保存。");
    }
    const result = await saveProjectAction(project);
    if (result.ok) {
      setCloud((state) => ({
        ...state,
        projects: upsert(state.projects, result.data),
      }));
    }
    finishCloudOperation(result);
    return result;
  }, [beginCloudOperation, finishCloudOperation]);

  const deleteProject = useCallback(async (id: string) => {
    if (!beginCloudOperation()) {
      return actionError("NETWORK_ERROR", "当前处于离线状态，项目尚未归档。");
    }
    const result = await archiveProjectAction(id);
    if (result.ok) {
      setCloud((state) => ({
        ...state,
        projects: state.projects.filter((project) => project.id !== id),
      }));
    }
    finishCloudOperation(result);
    return result;
  }, [beginCloudOperation, finishCloudOperation]);

  const removeProject = useCallback(async (id: string) => {
    if (!beginCloudOperation()) {
      return actionError("NETWORK_ERROR", "当前处于离线状态，项目尚未删除。");
    }
    const result = await removeProjectAction(id);
    if (result.ok) {
      setCloud((state) => ({
        ...state,
        projects: state.projects.filter((project) => project.id !== id),
      }));
    }
    finishCloudOperation(result);
    return result;
  }, [beginCloudOperation, finishCloudOperation]);

  const saveAgent = useCallback(async (agent: Agent) => {
    if (!beginCloudOperation()) {
      return actionError("NETWORK_ERROR", "当前处于离线状态，Agent 尚未保存。");
    }
    const result = await saveAgentAction(agent);
    if (result.ok) {
      setCloud((state) => ({
        ...state,
        agents: upsert(state.agents, result.data),
      }));
    }
    finishCloudOperation(result);
    return result;
  }, [beginCloudOperation, finishCloudOperation]);

  const deleteAgent = useCallback(async (id: string) => {
    if (!beginCloudOperation()) {
      return actionError("NETWORK_ERROR", "当前处于离线状态，Agent 尚未删除。");
    }
    const result = await removeAgentAction(id);
    if (result.ok) {
      setCloud((state) => ({
        ...state,
        agents: state.agents.filter((agent) => agent.id !== id),
      }));
    }
    finishCloudOperation(result);
    return result;
  }, [beginCloudOperation, finishCloudOperation]);

  const saveInboxItem = useCallback(async (item: InboxItem) => {
    if (!beginCloudOperation()) {
      return actionError("NETWORK_ERROR", "当前处于离线状态，收集项尚未保存。");
    }
    const result = await saveInboxItemAction(item);
    if (result.ok) {
      setCloud((state) => ({
        ...state,
        inbox: upsert(state.inbox, result.data),
      }));
    }
    finishCloudOperation(result);
    return result;
  }, [beginCloudOperation, finishCloudOperation]);

  const deleteInboxItem = useCallback(async (id: string) => {
    if (!beginCloudOperation()) {
      return actionError("NETWORK_ERROR", "当前处于离线状态，收集项尚未删除。");
    }
    const result = await removeInboxItemAction(id);
    if (result.ok) {
      setCloud((state) => ({
        ...state,
        inbox: state.inbox.filter((item) => item.id !== id),
      }));
    }
    finishCloudOperation(result);
    return result;
  }, [beginCloudOperation, finishCloudOperation]);

  const saveWorkflow = useCallback((nextWorkflow: Workflow) => {
    setWorkflow(nextWorkflow);
  }, []);

  const value = useMemo<StoreContextValue>(() => ({
    ...cloud,
    workflow,
    hydrated: true,
    syncStatus,
    syncError,
    lastSyncedAt,
    refreshCloudState,
    saveProject,
    deleteProject,
    removeProject,
    saveAgent,
    deleteAgent,
    saveInboxItem,
    deleteInboxItem,
    saveWorkflow,
  }), [
    cloud,
    deleteAgent,
    deleteInboxItem,
    deleteProject,
    lastSyncedAt,
    refreshCloudState,
    removeProject,
    saveAgent,
    saveInboxItem,
    saveProject,
    saveWorkflow,
    syncError,
    syncStatus,
    workflow,
  ]);

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useProjectOS() {
  const store = useContext(StoreContext);
  if (!store) throw new Error("useProjectOS must be used inside ProjectOSProvider");
  return store;
}
