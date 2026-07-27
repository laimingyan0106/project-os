"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  addEdge, applyEdgeChanges, applyNodeChanges, Background, BackgroundVariant, Controls,
  MiniMap, Panel, ReactFlow, type Connection, type EdgeChange, type Node, type NodeChange,
} from "@xyflow/react";
import { GitBranch, Plus, Save, Search, Trash2, Workflow as WorkflowIcon } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PageHeader } from "@/components/project-os/page-header";
import { useProjectOS } from "@/components/project-os/project-os-provider";
import type { WorkflowNodeData } from "@/lib/project-os";

const blankData: WorkflowNodeData = { label: "", kind: "agent", owner: "" };
const nodeTone = { trigger: "!border-sky-400/40 !bg-sky-400/10", agent: "!border-primary/40 !bg-primary/10", review: "!border-violet-400/40 !bg-violet-400/10", output: "!border-emerald-400/40 !bg-emerald-400/10" };
type AppNode = Node<WorkflowNodeData>;

export function WorkflowView() {
  const { workflow, saveWorkflow } = useProjectOS();
  const [nodes, setNodes] = useState(workflow.nodes);
  const [edges, setEdges] = useState(workflow.edges);
  const nodesRef = useRef(workflow.nodes);
  const edgesRef = useRef(workflow.edges);
  const [draft, setDraft] = useState<WorkflowNodeData | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [query, setQuery] = useState("");

  useEffect(() => {
    // The provider can hydrate a persisted workflow after this canvas mounts.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setNodes(workflow.nodes);
    setEdges(workflow.edges);
    nodesRef.current = workflow.nodes;
    edgesRef.current = workflow.edges;
  }, [workflow]);

  const persist = useCallback((nextNodes: typeof nodes, nextEdges: typeof edges) => {
    saveWorkflow({ ...workflow, nodes: nextNodes, edges: nextEdges });
  }, [saveWorkflow, workflow]);

  const onNodesChange = useCallback((changes: NodeChange<AppNode>[]) => {
    const next = applyNodeChanges(changes, nodesRef.current);
    nodesRef.current = next;
    setNodes(next);
    persist(next, edgesRef.current);
  }, [persist]);

  const onEdgesChange = useCallback((changes: EdgeChange[]) => {
    const next = applyEdgeChanges(changes, edgesRef.current);
    edgesRef.current = next;
    setEdges(next);
    persist(nodesRef.current, next);
  }, [persist]);

  const onConnect = useCallback((connection: Connection) => {
    const next = addEdge({ ...connection, animated: true }, edgesRef.current);
    edgesRef.current = next;
    setEdges(next);
    persist(nodesRef.current, next);
  }, [persist]);

  const openEdit = (id: string) => {
    const node = nodes.find((item) => item.id === id);
    if (node) { setEditingId(id); setDraft({ ...node.data }); }
  };

  const saveNode = () => {
    if (!draft?.label.trim()) return;
    const next = editingId
      ? nodes.map((node) => node.id === editingId ? { ...node, data: draft, className: nodeTone[draft.kind] } : node)
      : [...nodes, { id: crypto.randomUUID(), position: { x: 180 + nodes.length * 30, y: 120 + nodes.length * 18 }, data: draft, className: nodeTone[draft.kind] }];
    nodesRef.current = next;
    setNodes(next);
    persist(next, edgesRef.current);
    setDraft(null);
    setEditingId(null);
  };

  const removeNode = () => {
    if (!editingId) return;
    const nextNodes = nodes.filter((node) => node.id !== editingId);
    const nextEdges = edges.filter((edge) => edge.source !== editingId && edge.target !== editingId);
    nodesRef.current = nextNodes;
    edgesRef.current = nextEdges;
    setNodes(nextNodes); setEdges(nextEdges); persist(nextNodes, nextEdges);
    setDeleting(false); setDraft(null); setEditingId(null);
  };

  const visibleNodes = nodes.map((node) => ({
    ...node,
    className: `${nodeTone[node.data.kind]} ${query && !node.data.label.toLowerCase().includes(query.toLowerCase()) ? "!opacity-25" : ""} !rounded-lg !border !px-4 !py-3 !text-xs !font-medium !text-foreground !shadow-xl`,
  }));

  return (
    <>
      <PageHeader eyebrow="Workflow / Canvas" title="把目标变成可见的执行路径。"
        description="拖动节点调整结构，连接输入与输出；人工确认节点用于守住关键决策边界。"
        icon={WorkflowIcon} actions={<><Button variant="outline" onClick={() => persist(nodesRef.current, edgesRef.current)}><Save />已自动保存</Button><Button onClick={() => { setEditingId(null); setDraft({ ...blankData }); }}><Plus />添加节点</Button></>} />
      <div className="mb-4 flex items-center gap-3"><div className="relative max-w-xs flex-1"><Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="聚焦节点…" className="pl-9" /></div><Badge variant="outline" className="font-mono">{nodes.length} NODES · {edges.length} EDGES</Badge></div>
      <Card className="h-[calc(100vh-260px)] min-h-[540px] overflow-hidden bg-card/55">
        <ReactFlow nodes={visibleNodes} edges={edges} onNodesChange={onNodesChange} onEdgesChange={onEdgesChange} onConnect={onConnect}
          onNodeDoubleClick={(_, node) => openEdit(node.id)} fitView minZoom={0.4} maxZoom={1.8} colorMode="dark">
          <Background variant={BackgroundVariant.Dots} gap={22} size={1} color="rgba(255,255,255,.12)" />
          <Controls position="bottom-right" />
          <MiniMap position="bottom-left" pannable zoomable nodeColor={(node) => node.data?.kind === "review" ? "#a78bfa" : node.data?.kind === "output" ? "#34d399" : "#e8b84c"} maskColor="rgba(10,12,15,.78)" />
          <Panel position="top-left" className="rounded-md border bg-background/80 px-3 py-2 backdrop-blur">
            <div className="flex items-center gap-2 text-xs"><GitBranch className="size-3.5 text-primary" /><span className="font-medium">{workflow.title}</span><span className="font-mono text-[9px] text-muted-foreground">LIVE</span></div>
          </Panel>
          <Panel position="top-right" className="rounded-md border bg-background/80 px-3 py-2 font-mono text-[9px] text-muted-foreground backdrop-blur">双击节点进行编辑</Panel>
        </ReactFlow>
      </Card>

      <Dialog open={!!draft} onOpenChange={(open) => { if (!open) { setDraft(null); setEditingId(null); } }}>
        <DialogContent><DialogHeader><DialogTitle>{editingId ? "编辑节点" : "添加工作流节点"}</DialogTitle><DialogDescription>一个节点只表达一个动作、判断或交付。</DialogDescription></DialogHeader>
          {draft && <div className="space-y-4"><div><label className="mb-2 block text-xs">节点名称</label><Input autoFocus value={draft.label} onChange={(e) => setDraft({ ...draft, label: e.target.value })} placeholder="例如：人工确认" /></div><div><label className="mb-2 block text-xs">负责人 / Agent</label><Input value={draft.owner} onChange={(e) => setDraft({ ...draft, owner: e.target.value })} placeholder="You / Scope / Forge" /></div><div><label className="mb-2 block text-xs">节点类型</label><Select value={draft.kind} onValueChange={(value) => setDraft({ ...draft, kind: value as WorkflowNodeData["kind"] })}><SelectTrigger className="w-full"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="trigger">Trigger</SelectItem><SelectItem value="agent">Agent</SelectItem><SelectItem value="review">Human Review</SelectItem><SelectItem value="output">Output</SelectItem></SelectContent></Select></div><DialogFooter className="sm:justify-between">{editingId ? <Button variant="destructive" onClick={() => setDeleting(true)}><Trash2 />删除</Button> : <span />}<div className="flex gap-2"><Button variant="ghost" onClick={() => setDraft(null)}>取消</Button><Button onClick={saveNode}>保存节点</Button></div></DialogFooter></div>}
        </DialogContent>
      </Dialog>
      <AlertDialog open={deleting} onOpenChange={setDeleting}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>删除这个节点？</AlertDialogTitle><AlertDialogDescription>与它连接的边也会被移除。</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>取消</AlertDialogCancel><AlertDialogAction variant="destructive" onClick={removeNode}>删除节点</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
    </>
  );
}
