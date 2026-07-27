"use client";

import { useMemo, useState } from "react";
import { ArrowRight, Bot, BrainCircuit, MoreHorizontal, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PageHeader } from "@/components/project-os/page-header";
import { useProjectOS } from "@/components/project-os/project-os-provider";
import type { Agent } from "@/lib/project-os";

const blank: Agent = { id: "", name: "", role: "", input: "", output: "", status: "draft" };
const statusTone = { ready: "text-emerald-300 bg-emerald-400/10 border-emerald-400/20", working: "text-primary bg-primary/10 border-primary/20", draft: "text-muted-foreground" };

export function AgentsView() {
  const { agents, saveAgent, deleteAgent } = useProjectOS();
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<Agent | null>(null);
  const [deleting, setDeleting] = useState<Agent | null>(null);
  const filtered = useMemo(() => agents.filter((agent) => `${agent.name} ${agent.role}`.toLowerCase().includes(query.toLowerCase())), [agents, query]);
  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!editing?.name.trim()) return;
    saveAgent({ ...editing, id: editing.id || crypto.randomUUID(), name: editing.name.trim() });
    setEditing(null);
  };

  return (
    <>
      <PageHeader eyebrow="Agents / Orchestra" title="组建你的 AI 执行团队。"
        description="每个 Agent 只承担一个清晰角色，并通过定义好的输入、输出和下一站完成接力。"
        icon={BrainCircuit} actions={<Button onClick={() => setEditing({ ...blank })}><Plus />创建 Agent</Button>} />
      <div className="mb-5 flex max-w-sm items-center"><div className="relative w-full"><Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="搜索代理或角色…" className="pl-9" /></div></div>
      <div className="grid gap-4 lg:grid-cols-2 2xl:grid-cols-3">
        {filtered.map((agent, index) => {
          const next = agents.find((item) => item.id === agent.nextAgent);
          return (
            <Card key={agent.id} className="bg-card/70 transition-colors hover:border-primary/25">
              <CardContent className="p-5">
                <div className="flex items-start gap-4">
                  <div className="relative grid size-11 shrink-0 place-items-center rounded-xl border bg-background"><Bot className="size-5 text-primary" /><span className="absolute -right-1 -top-1 size-2.5 rounded-full border-2 border-card bg-emerald-400" /></div>
                  <div className="min-w-0 flex-1"><div className="flex items-center justify-between"><p className="font-mono text-[9px] text-muted-foreground">AGENT / {String(index + 1).padStart(2, "0")}</p>
                    <DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="icon-sm" aria-label="代理操作"><MoreHorizontal /></Button></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuItem onClick={() => setEditing(agent)}><Pencil />编辑</DropdownMenuItem><DropdownMenuSeparator /><DropdownMenuItem variant="destructive" onClick={() => setDeleting(agent)}><Trash2 />删除</DropdownMenuItem></DropdownMenuContent></DropdownMenu>
                  </div><h2 className="text-lg font-semibold">{agent.name}</h2><p className="mt-1 text-xs text-muted-foreground">{agent.role}</p></div>
                </div>
                <div className="mt-5 grid grid-cols-2 gap-2">
                  <div className="rounded-md border bg-background/35 p-3"><p className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground">Input</p><p className="mt-2 text-xs leading-5">{agent.input || "未定义"}</p></div>
                  <div className="rounded-md border bg-background/35 p-3"><p className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground">Output</p><p className="mt-2 text-xs leading-5">{agent.output || "未定义"}</p></div>
                </div>
                <div className="mt-4 flex items-center justify-between border-t pt-4"><Badge variant="outline" className={statusTone[agent.status]}>{agent.status.toUpperCase()}</Badge><div className="flex items-center gap-2 text-[11px] text-muted-foreground">{next ? <>next <ArrowRight className="size-3" /> <span className="text-foreground">{next.name}</span></> : "终点 Agent"}</div></div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Dialog open={!!editing} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent><DialogHeader><DialogTitle>{editing?.id ? "编辑 Agent" : "创建 Agent"}</DialogTitle><DialogDescription>让角色边界清晰，协作才会稳定。</DialogDescription></DialogHeader>
          {editing && <form onSubmit={submit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3"><div><label className="mb-2 block text-xs">名称</label><Input autoFocus value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} placeholder="Scope" /></div><div><label className="mb-2 block text-xs">角色</label><Input value={editing.role} onChange={(e) => setEditing({ ...editing, role: e.target.value })} placeholder="项目拆解" /></div></div>
            <div><label className="mb-2 block text-xs">输入</label><Input value={editing.input} onChange={(e) => setEditing({ ...editing, input: e.target.value })} placeholder="它接收什么？" /></div>
            <div><label className="mb-2 block text-xs">输出</label><Input value={editing.output} onChange={(e) => setEditing({ ...editing, output: e.target.value })} placeholder="它必须交付什么？" /></div>
            <div className="grid grid-cols-2 gap-3"><div><label className="mb-2 block text-xs">状态</label><Select value={editing.status} onValueChange={(value) => setEditing({ ...editing, status: value as Agent["status"] })}><SelectTrigger className="w-full"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="draft">Draft</SelectItem><SelectItem value="ready">Ready</SelectItem><SelectItem value="working">Working</SelectItem></SelectContent></Select></div><div><label className="mb-2 block text-xs">下一 Agent</label><Select value={editing.nextAgent || "none"} onValueChange={(value) => setEditing({ ...editing, nextAgent: value === "none" ? undefined : value })}><SelectTrigger className="w-full"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="none">无 / 终点</SelectItem>{agents.filter((a) => a.id !== editing.id).map((a) => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}</SelectContent></Select></div></div>
            <DialogFooter><Button type="button" variant="ghost" onClick={() => setEditing(null)}>取消</Button><Button type="submit">保存 Agent</Button></DialogFooter>
          </form>}
        </DialogContent>
      </Dialog>
      <AlertDialog open={!!deleting} onOpenChange={(open) => !open && setDeleting(null)}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>删除 Agent “{deleting?.name}”？</AlertDialogTitle><AlertDialogDescription>依赖该 Agent 的工作流节点需要随后手动调整。</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>取消</AlertDialogCancel><AlertDialogAction variant="destructive" onClick={() => { if (deleting) deleteAgent(deleting.id); setDeleting(null); }}>删除</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
    </>
  );
}
