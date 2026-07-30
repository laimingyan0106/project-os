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
  archiveKnowledgeAction,
  archiveProjectAction,
  createPromptAction,
  createWorkflowAction,
  duplicateWorkflowAction,
  getLocalMigrationStatusAction,
  importLegacyV1SnapshotAction,
  refreshCloudStateAction,
  removeAgentAction,
  removeKnowledgeAction,
  removeInboxItemAction,
  removeProjectAction,
  removePromptAction,
  removeWorkflowAction,
  saveAgentAction,
  saveInboxItemAction,
  saveKnowledgeAction,
  saveProjectAction,
  publishPromptVersionAction,
  updatePromptMetadataAction,
} from "@/app/(workspace)/cloud-actions";
import { LocalMigrationDialog } from "@/components/project-os/local-migration-dialog";
import {
  actionError,
  type ActionResult,
} from "@/lib/action-result";
import type {
  Agent,
  InboxItem,
  KnowledgeItem,
  Project,
  PromptAsset,
  PromptCreateInput,
  PromptVersionInput,
  WorkflowSummary,
} from "@/lib/project-os";
import {
  createV1BackupRecord,
  isV1BackupExpired,
  type LocalMigrationSummary,
  V1_BACKUP_KEY,
  V1_STORAGE_KEY,
} from "@/lib/migration/v1-snapshot";
import type { CloudState } from "@/lib/repositories/contracts";

export type SyncStatus = "synced" | "syncing" | "offline" | "error";
export type LocalMigrationStatus =
  | "checking"
  | "not-found"
  | "available"
  | "importing"
  | "success"
  | "error";

interface StoreContextValue extends CloudState {
  hydrated: boolean;
  syncStatus: SyncStatus;
  syncError?: string;
  lastSyncedAt?: string;
  localMigrationStatus: LocalMigrationStatus;
  localMigrationSummary?: LocalMigrationSummary;
  openLocalMigration: (sourceJson?: string) => void;
  refreshCloudState: () => Promise<ActionResult<CloudState>>;
  saveProject: (project: Project) => Promise<ActionResult<Project>>;
  deleteProject: (id: string) => Promise<ActionResult<Project>>;
  removeProject: (id: string) => Promise<ActionResult<null>>;
  saveAgent: (agent: Agent) => Promise<ActionResult<Agent>>;
  deleteAgent: (id: string) => Promise<ActionResult<null>>;
  saveInboxItem: (item: InboxItem) => Promise<ActionResult<InboxItem>>;
  deleteInboxItem: (id: string) => Promise<ActionResult<null>>;
  createWorkflow: (input: {
    title: string;
    description?: string;
    projectId?: string;
  }) => Promise<ActionResult<WorkflowSummary>>;
  duplicateWorkflow: (id: string) => Promise<ActionResult<WorkflowSummary>>;
  deleteWorkflow: (id: string) => Promise<ActionResult<null>>;
  createPrompt: (input: PromptCreateInput) => Promise<ActionResult<PromptAsset>>;
  updatePrompt: (prompt: PromptAsset) => Promise<ActionResult<PromptAsset>>;
  publishPromptVersion: (
    id: string,
    input: PromptVersionInput,
  ) => Promise<ActionResult<PromptAsset>>;
  deletePrompt: (id: string) => Promise<ActionResult<null>>;
  saveKnowledge: (item: KnowledgeItem) => Promise<ActionResult<KnowledgeItem>>;
  archiveKnowledge: (id: string) => Promise<ActionResult<KnowledgeItem>>;
  deleteKnowledge: (id: string) => Promise<ActionResult<null>>;
}

const StoreContext = createContext<StoreContextValue | null>(null);
const MIGRATION_DISMISSED_KEY = "project-os:v1:migration-dismissed";

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
  const [syncStatus, setSyncStatus] = useState<SyncStatus>(
    initialCloudError ? "error" : "synced",
  );
  const [syncError, setSyncError] = useState(initialCloudError);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | undefined>(
    initialCloudError ? undefined : new Date().toISOString(),
  );
  const [localMigrationStatus, setLocalMigrationStatus] =
    useState<LocalMigrationStatus>("checking");
  const [localMigrationSummary, setLocalMigrationSummary] =
    useState<LocalMigrationSummary>();
  const [migrationDialog, setMigrationDialog] = useState<{
    open: boolean;
    key: number;
    sourceJson?: string;
    result?: LocalMigrationSummary;
  }>({ open: false, key: 0 });
  const [migrationError, setMigrationError] = useState<string>();

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

  const openLocalMigration = useCallback((sourceJson?: string) => {
    const detectedSource = sourceJson ?? window.localStorage.getItem(V1_STORAGE_KEY) ?? undefined;
    setMigrationError(undefined);
    setMigrationDialog((current) => ({
      open: true,
      key: current.key + 1,
      sourceJson: detectedSource,
      result: undefined,
    }));
  }, []);

  useEffect(() => {
    let active = true;

    const backup = window.localStorage.getItem(V1_BACKUP_KEY);
    if (backup) {
      try {
        const parsed = JSON.parse(backup) as { expiresAt?: string };
        if (!parsed.expiresAt || isV1BackupExpired({ expiresAt: parsed.expiresAt })) {
          window.localStorage.removeItem(V1_BACKUP_KEY);
        }
      } catch {
        window.localStorage.removeItem(V1_BACKUP_KEY);
      }
    }

    const localSnapshot = window.localStorage.getItem(V1_STORAGE_KEY) ?? undefined;
    void getLocalMigrationStatusAction().then((result) => {
      if (!active) return;
      if (!result.ok) {
        setLocalMigrationStatus("error");
        setMigrationError(result.error.message);
        return;
      }
      if (result.data) {
        setLocalMigrationSummary(result.data);
        setLocalMigrationStatus("success");
        return;
      }
      if (!localSnapshot) {
        setLocalMigrationStatus("not-found");
        return;
      }

      setLocalMigrationStatus("available");
      if (!window.sessionStorage.getItem(MIGRATION_DISMISSED_KEY)) {
        setMigrationDialog((current) => ({
          open: true,
          key: current.key + 1,
          sourceJson: localSnapshot,
          result: undefined,
        }));
      }
    });

    return () => {
      active = false;
    };
  }, []);

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

  const createWorkflow = useCallback(async (input: {
    title: string;
    description?: string;
    projectId?: string;
  }) => {
    if (!beginCloudOperation()) {
      return actionError("NETWORK_ERROR", "当前处于离线状态，工作流尚未创建。");
    }
    const result = await createWorkflowAction(input);
    if (result.ok) {
      setCloud((state) => ({
        ...state,
        workflows: upsert(state.workflows, result.data),
      }));
    }
    finishCloudOperation(result);
    return result;
  }, [beginCloudOperation, finishCloudOperation]);

  const duplicateWorkflow = useCallback(async (id: string) => {
    if (!beginCloudOperation()) {
      return actionError("NETWORK_ERROR", "当前处于离线状态，工作流尚未复制。");
    }
    const result = await duplicateWorkflowAction(id);
    if (result.ok) {
      setCloud((state) => ({
        ...state,
        workflows: upsert(state.workflows, result.data),
      }));
    }
    finishCloudOperation(result);
    return result;
  }, [beginCloudOperation, finishCloudOperation]);

  const deleteWorkflow = useCallback(async (id: string) => {
    if (!beginCloudOperation()) {
      return actionError("NETWORK_ERROR", "当前处于离线状态，工作流尚未删除。");
    }
    const result = await removeWorkflowAction(id);
    if (result.ok) {
      setCloud((state) => ({
        ...state,
        workflows: state.workflows.filter((workflow) => workflow.id !== id),
      }));
    }
    finishCloudOperation(result);
    return result;
  }, [beginCloudOperation, finishCloudOperation]);

  const createPrompt = useCallback(async (input: PromptCreateInput) => {
    if (!beginCloudOperation()) {
      return actionError("NETWORK_ERROR", "当前处于离线状态，Prompt 尚未创建。");
    }
    const result = await createPromptAction(input);
    if (result.ok) {
      setCloud((state) => ({
        ...state,
        prompts: upsert(state.prompts, result.data),
      }));
    }
    finishCloudOperation(result);
    return result;
  }, [beginCloudOperation, finishCloudOperation]);

  const updatePrompt = useCallback(async (prompt: PromptAsset) => {
    if (!beginCloudOperation()) {
      return actionError("NETWORK_ERROR", "当前处于离线状态，Prompt 尚未保存。");
    }
    const result = await updatePromptMetadataAction(prompt);
    if (result.ok) {
      setCloud((state) => ({
        ...state,
        prompts: upsert(state.prompts, result.data),
      }));
    }
    finishCloudOperation(result);
    return result;
  }, [beginCloudOperation, finishCloudOperation]);

  const publishPromptVersion = useCallback(async (
    id: string,
    input: PromptVersionInput,
  ) => {
    if (!beginCloudOperation()) {
      return actionError("NETWORK_ERROR", "当前处于离线状态，新版本尚未发布。");
    }
    const result = await publishPromptVersionAction(id, input);
    if (result.ok) {
      setCloud((state) => ({
        ...state,
        prompts: upsert(state.prompts, result.data),
      }));
    }
    finishCloudOperation(result);
    return result;
  }, [beginCloudOperation, finishCloudOperation]);

  const deletePrompt = useCallback(async (id: string) => {
    if (!beginCloudOperation()) {
      return actionError("NETWORK_ERROR", "当前处于离线状态，Prompt 尚未删除。");
    }
    const result = await removePromptAction(id);
    if (result.ok) {
      setCloud((state) => ({
        ...state,
        prompts: state.prompts.filter((prompt) => prompt.id !== id),
      }));
    }
    finishCloudOperation(result);
    return result;
  }, [beginCloudOperation, finishCloudOperation]);

  const saveKnowledge = useCallback(async (item: KnowledgeItem) => {
    if (!beginCloudOperation()) {
      return actionError("NETWORK_ERROR", "当前处于离线状态，知识条目尚未保存。");
    }
    const result = await saveKnowledgeAction(item);
    if (result.ok) {
      setCloud((state) => ({
        ...state,
        knowledge: upsert(state.knowledge, result.data),
      }));
    }
    finishCloudOperation(result);
    return result;
  }, [beginCloudOperation, finishCloudOperation]);

  const archiveKnowledge = useCallback(async (id: string) => {
    if (!beginCloudOperation()) {
      return actionError("NETWORK_ERROR", "当前处于离线状态，知识条目尚未归档。");
    }
    const result = await archiveKnowledgeAction(id);
    if (result.ok) {
      setCloud((state) => ({
        ...state,
        knowledge: state.knowledge.filter((item) => item.id !== id),
      }));
    }
    finishCloudOperation(result);
    return result;
  }, [beginCloudOperation, finishCloudOperation]);

  const deleteKnowledge = useCallback(async (id: string) => {
    if (!beginCloudOperation()) {
      return actionError("NETWORK_ERROR", "当前处于离线状态，知识条目尚未删除。");
    }
    const result = await removeKnowledgeAction(id);
    if (result.ok) {
      setCloud((state) => ({
        ...state,
        knowledge: state.knowledge.filter((item) => item.id !== id),
      }));
    }
    finishCloudOperation(result);
    return result;
  }, [beginCloudOperation, finishCloudOperation]);

  const importLocalSnapshot = useCallback(async (
    sourceJson: string,
    allowSeedImport: boolean,
  ) => {
    setLocalMigrationStatus("importing");
    setMigrationError(undefined);
    const result = await importLegacyV1SnapshotAction(sourceJson, allowSeedImport);
    if (!result.ok) {
      setLocalMigrationStatus("error");
      setMigrationError(result.error.message);
      return;
    }

    const migratedAt = new Date();
    try {
      window.localStorage.setItem(
        V1_BACKUP_KEY,
        JSON.stringify(createV1BackupRecord(sourceJson, migratedAt)),
      );
      if (window.localStorage.getItem(V1_STORAGE_KEY) === sourceJson) {
        window.localStorage.removeItem(V1_STORAGE_KEY);
      }
    } catch {
      setMigrationError(
        "云端导入成功，但浏览器无法写入 30 天备份；原始本地数据已保留。",
      );
    }

    setLocalMigrationSummary(result.data);
    setMigrationDialog((current) => ({ ...current, result: result.data }));
    setLocalMigrationStatus("success");
    window.sessionStorage.removeItem(MIGRATION_DISMISSED_KEY);
    await refreshCloudState();
  }, [refreshCloudState]);

  const skipLocalMigration = useCallback(() => {
    window.sessionStorage.setItem(MIGRATION_DISMISSED_KEY, "1");
    setMigrationDialog((current) => ({ ...current, open: false }));
  }, []);

  const value = useMemo<StoreContextValue>(() => ({
    ...cloud,
    hydrated: true,
    syncStatus,
    syncError,
    lastSyncedAt,
    localMigrationStatus,
    localMigrationSummary,
    openLocalMigration,
    refreshCloudState,
    saveProject,
    deleteProject,
    removeProject,
    saveAgent,
    deleteAgent,
    saveInboxItem,
    deleteInboxItem,
    createWorkflow,
    duplicateWorkflow,
    deleteWorkflow,
    createPrompt,
    updatePrompt,
    publishPromptVersion,
    deletePrompt,
    saveKnowledge,
    archiveKnowledge,
    deleteKnowledge,
  }), [
    archiveKnowledge,
    cloud,
    createPrompt,
    createWorkflow,
    deleteAgent,
    deleteInboxItem,
    deleteProject,
    deleteKnowledge,
    deletePrompt,
    deleteWorkflow,
    duplicateWorkflow,
    lastSyncedAt,
    localMigrationStatus,
    localMigrationSummary,
    openLocalMigration,
    refreshCloudState,
    removeProject,
    saveAgent,
    saveInboxItem,
    saveKnowledge,
    saveProject,
    publishPromptVersion,
    syncError,
    syncStatus,
    updatePrompt,
  ]);

  return (
    <StoreContext.Provider value={value}>
      {children}
      <LocalMigrationDialog
        open={migrationDialog.open}
        dialogKey={migrationDialog.key}
        initialSourceJson={migrationDialog.sourceJson}
        importing={localMigrationStatus === "importing"}
        error={migrationError}
        summary={migrationDialog.result}
        onOpenChange={(open) => {
          setMigrationDialog((current) => ({ ...current, open }));
        }}
        onImport={importLocalSnapshot}
        onSkip={skipLocalMigration}
      />
    </StoreContext.Provider>
  );
}

export function useProjectOS() {
  const store = useContext(StoreContext);
  if (!store) throw new Error("useProjectOS must be used inside ProjectOSProvider");
  return store;
}
