"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import Link from "next/link";
import {
  addEdge,
  applyEdgeChanges,
  applyNodeChanges,
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  Panel,
  ReactFlow,
  type Connection,
  type Edge,
  type EdgeChange,
  type Node,
  type NodeChange,
} from "@xyflow/react";
import {
  ArrowLeft,
  CircleAlert,
  CloudOff,
  GitBranch,
  LoaderCircle,
  Plus,
  RotateCcw,
  Save,
  Search,
  Trash2,
  Workflow as WorkflowIcon,
} from "lucide-react";
import { saveWorkflowGraphAction } from "@/app/(workspace)/cloud-actions";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PageHeader } from "@/components/project-os/page-header";
import type { Workflow, WorkflowNodeData } from "@/lib/project-os";

const blankData: WorkflowNodeData = {
  label: "",
  kind: "agent",
  owner: "",
};

const nodeTone = {
  trigger: "!border-sky-400/40 !bg-sky-400/10",
  agent: "!border-primary/40 !bg-primary/10",
  review: "!border-violet-400/40 !bg-violet-400/10",
  condition: "!border-amber-400/40 !bg-amber-400/10",
  output: "!border-emerald-400/40 !bg-emerald-400/10",
};

type AppNode = Node<WorkflowNodeData>;
type SaveStatus = "saved" | "saving" | "offline" | "error" | "conflict";

const statusLabel: Record<SaveStatus, string> = {
  saved: "已保存",
  saving: "保存中",
  offline: "离线草稿",
  error: "保存失败",
  conflict: "版本冲突",
};

export function WorkflowView({
  initialWorkflow,
}: {
  initialWorkflow: Workflow;
}) {
  const [nodes, setNodes] = useState(initialWorkflow.nodes);
  const [edges, setEdges] = useState(initialWorkflow.edges);
  const [version, setVersion] = useState(initialWorkflow.version);
  const [lastSavedAt, setLastSavedAt] = useState(initialWorkflow.updatedAt);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("saved");
  const [saveError, setSaveError] = useState<string>();
  const [draft, setDraft] = useState<WorkflowNodeData | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [query, setQuery] = useState("");

  const nodesRef = useRef(initialWorkflow.nodes);
  const edgesRef = useRef(initialWorkflow.edges);
  const workflowRef = useRef(initialWorkflow);
  const versionRef = useRef(initialWorkflow.version);
  const dirtyRef = useRef(false);
  const savingRef = useRef(false);
  const conflictRef = useRef(false);
  const dragTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const runSaveQueue = useCallback(async () => {
    if (savingRef.current || conflictRef.current) return;
    if (!navigator.onLine) {
      setSaveStatus("offline");
      setSaveError("当前离线，画布改动仍保留在本页，联网后可重试。");
      return;
    }

    savingRef.current = true;
    try {
      while (dirtyRef.current) {
        dirtyRef.current = false;
        setSaveStatus("saving");
        setSaveError(undefined);
        const result = await saveWorkflowGraphAction({
          ...workflowRef.current,
          version: versionRef.current,
          nodes: nodesRef.current,
          edges: edgesRef.current,
        });

        if (!result.ok) {
          if (result.error.code === "CONFLICT") {
            conflictRef.current = true;
            setSaveStatus("conflict");
          } else if (result.error.code === "NETWORK_ERROR") {
            dirtyRef.current = true;
            setSaveStatus("offline");
          } else {
            setSaveStatus("error");
          }
          setSaveError(result.error.message);
          break;
        }

        workflowRef.current = result.data;
        versionRef.current = result.data.version;
        setVersion(result.data.version);
        setLastSavedAt(result.data.updatedAt);
        if (!dirtyRef.current) setSaveStatus("saved");
      }
    } finally {
      savingRef.current = false;
    }
  }, []);

  const queueSave = useCallback(() => {
    dirtyRef.current = true;
    if (conflictRef.current) {
      setSaveStatus("conflict");
      return;
    }
    if (!navigator.onLine) {
      setSaveStatus("offline");
      setSaveError("当前离线，画布改动仍保留在本页。");
      return;
    }
    setSaveStatus("saving");
    void runSaveQueue();
  }, [runSaveQueue]);

  const schedulePositionSave = useCallback(() => {
    setSaveStatus("saving");
    if (dragTimerRef.current) clearTimeout(dragTimerRef.current);
    dragTimerRef.current = setTimeout(queueSave, 650);
  }, [queueSave]);

  useEffect(() => {
    const handleOnline = () => {
      if (dirtyRef.current) void runSaveQueue();
    };
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (dirtyRef.current || savingRef.current) {
        event.preventDefault();
        event.returnValue = "";
      }
    };
    window.addEventListener("online", handleOnline);
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("beforeunload", handleBeforeUnload);
      if (dragTimerRef.current) clearTimeout(dragTimerRef.current);
    };
  }, [runSaveQueue]);

  const onNodesChange = useCallback((changes: NodeChange<AppNode>[]) => {
    const next = applyNodeChanges(changes, nodesRef.current);
    nodesRef.current = next;
    setNodes(next);
    if (changes.some((change) => change.type === "remove")) {
      queueSave();
    } else if (changes.some((change) => change.type === "position")) {
      schedulePositionSave();
    }
  }, [queueSave, schedulePositionSave]);

  const onEdgesChange = useCallback((changes: EdgeChange<Edge>[]) => {
    const next = applyEdgeChanges(changes, edgesRef.current);
    edgesRef.current = next;
    setEdges(next);
    if (changes.some((change) => change.type === "remove")) queueSave();
  }, [queueSave]);

  const onConnect = useCallback((connection: Connection) => {
    const next = addEdge({
      ...connection,
      id: crypto.randomUUID(),
      animated: true,
    }, edgesRef.current);
    edgesRef.current = next;
    setEdges(next);
    queueSave();
  }, [queueSave]);

  const openEdit = (id: string) => {
    const node = nodesRef.current.find((item) => item.id === id);
    if (node) {
      setEditingId(id);
      setDraft({ ...node.data });
    }
  };

  const saveNode = () => {
    if (!draft?.label.trim()) return;
    const next = editingId
      ? nodesRef.current.map((node) => node.id === editingId
        ? { ...node, data: draft, className: nodeTone[draft.kind] }
        : node)
      : [
        ...nodesRef.current,
        {
          id: crypto.randomUUID(),
          position: {
            x: 180 + nodesRef.current.length * 30,
            y: 120 + nodesRef.current.length * 18,
          },
          data: draft,
          className: nodeTone[draft.kind],
        },
      ];
    nodesRef.current = next;
    setNodes(next);
    queueSave();
    setDraft(null);
    setEditingId(null);
  };

  const removeNode = () => {
    if (!editingId) return;
    const nextNodes = nodesRef.current.filter((node) => node.id !== editingId);
    const nextEdges = edgesRef.current.filter(
      (edge) => edge.source !== editingId && edge.target !== editingId,
    );
    nodesRef.current = nextNodes;
    edgesRef.current = nextEdges;
    setNodes(nextNodes);
    setEdges(nextEdges);
    queueSave();
    setDeleting(false);
    setDraft(null);
    setEditingId(null);
  };

  const visibleNodes = nodes.map((node) => ({
    ...node,
    className: [
      nodeTone[node.data.kind],
      query && !node.data.label.toLowerCase().includes(query.toLowerCase())
        ? "!opacity-25"
        : "",
      "!rounded-lg !border !px-4 !py-3 !text-xs !font-medium",
      "!text-foreground !shadow-xl",
    ].join(" "),
  }));

  const retrySave = () => {
    conflictRef.current = false;
    queueSave();
  };

  return (
    <>
      <PageHeader
        eyebrow="Workflow / Canvas"
        title={initialWorkflow.title}
        description={initialWorkflow.description || "拖动节点调整结构，连接输入与输出。"}
        icon={WorkflowIcon}
        actions={(
          <>
            <Button asChild variant="ghost">
              <Link href="/workflows">
                <ArrowLeft />
                返回列表
              </Link>
            </Button>
            <Button
              variant="outline"
              onClick={queueSave}
              disabled={saveStatus === "saving" || saveStatus === "conflict"}
            >
              {saveStatus === "saving" ? (
                <LoaderCircle className="animate-spin" />
              ) : saveStatus === "offline" ? (
                <CloudOff />
              ) : saveStatus === "error" || saveStatus === "conflict" ? (
                <CircleAlert />
              ) : (
                <Save />
              )}
              {statusLabel[saveStatus]}
            </Button>
            <Button onClick={() => {
              setEditingId(null);
              setDraft({ ...blankData });
            }}>
              <Plus />
              添加节点
            </Button>
          </>
        )}
      />

      {saveStatus === "conflict" || saveStatus === "error" || saveStatus === "offline" ? (
        <Card className="mb-4 flex items-center justify-between gap-4 border-destructive/30 bg-destructive/5 p-4">
          <div>
            <p className="text-sm font-medium">{statusLabel[saveStatus]}</p>
            <p role="alert" className="mt-1 text-xs text-muted-foreground">
              {saveError}
            </p>
          </div>
          {saveStatus === "conflict" ? (
            <Button variant="outline" onClick={() => window.location.reload()}>
              <RotateCcw />
              载入云端最新版
            </Button>
          ) : (
            <Button variant="outline" onClick={retrySave}>
              <RotateCcw />
              重试保存
            </Button>
          )}
        </Card>
      ) : null}

      <div className="mb-4 flex items-center gap-3">
        <div className="relative max-w-xs flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="聚焦节点…"
            className="pl-9"
          />
        </div>
        <Badge variant="outline" className="font-mono">
          {nodes.length} NODES · {edges.length} EDGES · V{version}
        </Badge>
        <span className="hidden text-[10px] text-muted-foreground lg:inline">
          最近保存：{lastSavedAt
            ? new Date(lastSavedAt).toLocaleTimeString("zh-CN", {
              hour: "2-digit",
              minute: "2-digit",
            })
            : "尚未保存"}
        </span>
      </div>

      <Card className="h-[calc(100vh-260px)] min-h-[540px] overflow-hidden bg-card/55">
        <ReactFlow
          nodes={visibleNodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeDragStop={() => {
            if (dragTimerRef.current) clearTimeout(dragTimerRef.current);
            queueSave();
          }}
          onNodeDoubleClick={(_, node) => openEdit(node.id)}
          fitView
          minZoom={0.4}
          maxZoom={1.8}
          colorMode="dark"
        >
          <Background
            variant={BackgroundVariant.Dots}
            gap={22}
            size={1}
            color="rgba(255,255,255,.12)"
          />
          <Controls position="bottom-right" />
          <MiniMap
            position="bottom-left"
            pannable
            zoomable
            nodeColor={(node) => node.data?.kind === "review"
              ? "#a78bfa"
              : node.data?.kind === "output"
                ? "#34d399"
                : "#e8b84c"}
            maskColor="rgba(10,12,15,.78)"
          />
          <Panel
            position="top-left"
            className="rounded-md border bg-background/80 px-3 py-2 backdrop-blur"
          >
            <div className="flex items-center gap-2 text-xs">
              <GitBranch className="size-3.5 text-primary" />
              <span className="font-medium">{initialWorkflow.title}</span>
              <span className="font-mono text-[9px] text-muted-foreground">
                {statusLabel[saveStatus].toUpperCase()}
              </span>
            </div>
          </Panel>
          <Panel
            position="top-right"
            className="rounded-md border bg-background/80 px-3 py-2 font-mono text-[9px] text-muted-foreground backdrop-blur"
          >
            双击节点进行编辑
          </Panel>
        </ReactFlow>
      </Card>

      <Dialog
        open={Boolean(draft)}
        onOpenChange={(open) => {
          if (!open) {
            setDraft(null);
            setEditingId(null);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingId ? "编辑节点" : "添加工作流节点"}</DialogTitle>
            <DialogDescription>
              一个节点只表达一个动作、判断或交付。
            </DialogDescription>
          </DialogHeader>
          {draft ? (
            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-xs" htmlFor="workflow-node-label">
                  节点名称
                </label>
                <Input
                  id="workflow-node-label"
                  autoFocus
                  value={draft.label}
                  onChange={(event) => setDraft({ ...draft, label: event.target.value })}
                  placeholder="例如：人工确认"
                />
              </div>
              <div>
                <label className="mb-2 block text-xs" htmlFor="workflow-node-owner">
                  负责人 / Agent
                </label>
                <Input
                  id="workflow-node-owner"
                  value={draft.owner}
                  onChange={(event) => setDraft({ ...draft, owner: event.target.value })}
                  placeholder="You / Scope / Forge"
                />
              </div>
              <div>
                <label className="mb-2 block text-xs">节点类型</label>
                <Select
                  value={draft.kind}
                  onValueChange={(value) => setDraft({
                    ...draft,
                    kind: value as WorkflowNodeData["kind"],
                  })}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="trigger">Trigger</SelectItem>
                    <SelectItem value="agent">Agent</SelectItem>
                    <SelectItem value="review">Human Review</SelectItem>
                    <SelectItem value="condition">Condition</SelectItem>
                    <SelectItem value="output">Output</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <DialogFooter className="sm:justify-between">
                {editingId ? (
                  <Button variant="destructive" onClick={() => setDeleting(true)}>
                    <Trash2 />
                    删除
                  </Button>
                ) : <span />}
                <div className="flex gap-2">
                  <Button variant="ghost" onClick={() => setDraft(null)}>
                    取消
                  </Button>
                  <Button onClick={saveNode} disabled={!draft.label.trim()}>
                    保存节点
                  </Button>
                </div>
              </DialogFooter>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleting} onOpenChange={setDeleting}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>删除这个节点？</AlertDialogTitle>
            <AlertDialogDescription>
              与它连接的边也会被移除。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={removeNode}>
              删除节点
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
