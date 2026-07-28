"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Archive, FolderKanban, LoaderCircle, MoreHorizontal, Pencil, Plus, Search, Workflow } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { PageHeader } from "@/components/project-os/page-header";
import { useProjectOS } from "@/components/project-os/project-os-provider";
import type { Priority, Project, ProjectStatus } from "@/lib/project-os";

const emptyProject: Project = { id: "", title: "", goal: "", status: "planning", priority: "medium", updatedAt: "刚刚" };
const labels = { active: "进行中", planning: "规划中", blocked: "受阻", done: "已完成" };
const accents = { active: "bg-emerald-400", planning: "bg-sky-400", blocked: "bg-red-400", done: "bg-muted-foreground" };

export function ProjectsView({ openCreate = false }: { openCreate?: boolean }) {
  const { projects, workflows, saveProject, deleteProject } = useProjectOS();
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<Project | null>(
    openCreate ? { ...emptyProject } : null,
  );
  const [deleting, setDeleting] = useState<Project | null>(null);
  const [pending, setPending] = useState(false);
  const [operationError, setOperationError] = useState<string>();

  const filtered = useMemo(() => projects.filter((project) =>
    `${project.title} ${project.goal}`.toLowerCase().includes(query.toLowerCase())), [projects, query]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!editing?.title.trim()) return;
    setPending(true);
    setOperationError(undefined);
    const result = await saveProject({
      ...editing,
      id: editing.id || crypto.randomUUID(),
      title: editing.title.trim(),
      updatedAt: new Date().toISOString(),
    });
    setPending(false);
    if (result.ok) setEditing(null);
    else setOperationError(result.error.message);
  };

  const archiveSelectedProject = async () => {
    if (!deleting) return;
    setPending(true);
    setOperationError(undefined);
    const result = await deleteProject(deleting.id);
    setPending(false);
    if (result.ok) setDeleting(null);
    else setOperationError(result.error.message);
  };

  return (
    <>
      <PageHeader eyebrow="Projects / Portfolio" title="项目不是清单，是目标的容器。"
        description="集中管理目标、优先级与执行状态；每个项目都可以连接一个独立工作流。"
        icon={FolderKanban} actions={<Button onClick={() => setEditing({ ...emptyProject })}><Plus />创建项目</Button>} />
      <div className="mb-5 flex items-center gap-3">
        <div className="relative max-w-sm flex-1"><Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="搜索项目或目标…" className="pl-9" /></div>
        <Badge variant="outline" className="h-9 px-3 font-mono text-[10px]">{filtered.length} PROJECTS</Badge>
      </div>
      <div className="grid gap-3 lg:grid-cols-2 2xl:grid-cols-3">
        {filtered.map((project, index) => (
          <Card key={project.id} className="group overflow-hidden bg-card/70 transition-colors hover:border-primary/25">
            <div className={`h-0.5 ${accents[project.status]}`} />
            <CardContent className="p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0"><p className="font-mono text-[9px] text-muted-foreground">PROJECT / {String(index + 1).padStart(2, "0")}</p><h2 className="mt-3 truncate text-base font-semibold"><Link href={`/projects/${project.id}`} className="hover:text-primary">{project.title}</Link></h2></div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild><Button size="icon-sm" variant="ghost" aria-label="项目操作"><MoreHorizontal /></Button></DropdownMenuTrigger>
                  <DropdownMenuContent align="end"><DropdownMenuItem onClick={() => setEditing(project)}><Pencil />编辑</DropdownMenuItem><DropdownMenuSeparator /><DropdownMenuItem onClick={() => setDeleting(project)}><Archive />归档</DropdownMenuItem></DropdownMenuContent>
                </DropdownMenu>
              </div>
              <p className="mt-4 min-h-10 text-sm leading-5 text-muted-foreground">{project.goal}</p>
              <div className="mt-6 flex items-center gap-2">
                <Badge variant="outline"><span className={`mr-1.5 size-1.5 rounded-full ${accents[project.status]}`} />{labels[project.status]}</Badge>
                <Badge variant="secondary">{project.priority.toUpperCase()}</Badge>
                {workflows.some((workflow) => workflow.projectId === project.id) && (
                  <Workflow className="ms-auto size-3.5 text-primary" />
                )}
              </div>
              <div className="mt-5 border-t pt-3 font-mono text-[9px] uppercase tracking-wider text-muted-foreground">updated {project.updatedAt}</div>
            </CardContent>
          </Card>
        ))}
        {filtered.length === 0 && <Card className="col-span-full border-dashed bg-transparent"><CardContent className="grid min-h-48 place-items-center text-center"><div><FolderKanban className="mx-auto mb-3 size-7 text-muted-foreground" /><p className="text-sm font-medium">没有匹配项目</p><p className="mt-1 text-xs text-muted-foreground">换一个关键词，或创建第一个项目。</p></div></CardContent></Card>}
      </div>

      <Dialog open={!!editing} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing?.id ? "编辑项目" : "创建项目"}</DialogTitle><DialogDescription>先写清目标，再决定系统如何执行。</DialogDescription></DialogHeader>
          {editing && <form onSubmit={submit} className="space-y-4">
            <div><label className="mb-2 block text-xs font-medium">项目名称</label><Input autoFocus value={editing.title} onChange={(e) => setEditing({ ...editing, title: e.target.value })} placeholder="例如：Project OS MVP" /></div>
            <div><label className="mb-2 block text-xs font-medium">目标</label><Textarea value={editing.goal} onChange={(e) => setEditing({ ...editing, goal: e.target.value })} placeholder="完成后，什么会发生改变？" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="mb-2 block text-xs font-medium">状态</label><Select value={editing.status} onValueChange={(value) => setEditing({ ...editing, status: value as ProjectStatus })}><SelectTrigger className="w-full"><SelectValue /></SelectTrigger><SelectContent>{Object.entries(labels).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent></Select></div>
              <div><label className="mb-2 block text-xs font-medium">优先级</label><Select value={editing.priority} onValueChange={(value) => setEditing({ ...editing, priority: value as Priority })}><SelectTrigger className="w-full"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="high">High</SelectItem><SelectItem value="medium">Medium</SelectItem><SelectItem value="low">Low</SelectItem></SelectContent></Select></div>
            </div>
            {operationError ? <p role="alert" className="text-sm text-destructive">{operationError}</p> : null}
            <DialogFooter><Button type="button" variant="ghost" onClick={() => setEditing(null)} disabled={pending}>取消</Button><Button type="submit" disabled={pending}>{pending ? <LoaderCircle className="animate-spin" /> : null}保存项目</Button></DialogFooter>
          </form>}
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleting} onOpenChange={(open) => !open && setDeleting(null)}>
        <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>归档“{deleting?.title}”？</AlertDialogTitle><AlertDialogDescription>项目会从当前列表隐藏，关联数据仍保留在云端。</AlertDialogDescription></AlertDialogHeader>{operationError ? <p role="alert" className="text-sm text-destructive">{operationError}</p> : null}<AlertDialogFooter><AlertDialogCancel disabled={pending}>取消</AlertDialogCancel><AlertDialogAction onClick={(event) => { event.preventDefault(); void archiveSelectedProject(); }} disabled={pending}>{pending ? <LoaderCircle className="animate-spin" /> : <Archive />}确认归档</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
      </AlertDialog>
    </>
  );
}
