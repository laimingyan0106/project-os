"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Copy,
  GitBranch,
  LoaderCircle,
  Plus,
  Search,
  Trash2,
  Workflow,
} from "lucide-react";
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { useProjectOS } from "@/components/project-os/project-os-provider";
import type { WorkflowSummary } from "@/lib/project-os";

function formatUpdatedAt(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "刚刚"
    : new Intl.DateTimeFormat("zh-CN", {
      month: "numeric",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
}

export function WorkflowsView() {
  const router = useRouter();
  const {
    workflows,
    projects,
    createWorkflow,
    duplicateWorkflow,
    deleteWorkflow,
  } = useProjectOS();
  const [query, setQuery] = useState("");
  const [creating, setCreating] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [projectId, setProjectId] = useState("none");
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<WorkflowSummary | null>(null);
  const [operationError, setOperationError] = useState<string>();

  const visible = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return workflows;
    return workflows.filter((workflow) =>
      `${workflow.title} ${workflow.description}`.toLowerCase().includes(normalized),
    );
  }, [query, workflows]);

  const submitCreate = async () => {
    if (!title.trim()) return;
    setPendingId("create");
    setOperationError(undefined);
    const result = await createWorkflow({
      title: title.trim(),
      description: description.trim(),
      projectId: projectId === "none" ? undefined : projectId,
    });
    setPendingId(null);
    if (!result.ok) {
      setOperationError(result.error.message);
      return;
    }
    setCreating(false);
    setTitle("");
    setDescription("");
    setProjectId("none");
    router.push(`/workflows/${result.data.id}`);
  };

  const duplicate = async (workflow: WorkflowSummary) => {
    setPendingId(workflow.id);
    setOperationError(undefined);
    const result = await duplicateWorkflow(workflow.id);
    setPendingId(null);
    if (!result.ok) {
      setOperationError(result.error.message);
      return;
    }
    router.push(`/workflows/${result.data.id}`);
  };

  const removeSelected = async () => {
    if (!deleting) return;
    setPendingId(deleting.id);
    setOperationError(undefined);
    const result = await deleteWorkflow(deleting.id);
    setPendingId(null);
    if (!result.ok) {
      setOperationError(result.error.message);
      return;
    }
    setDeleting(null);
  };

  return (
    <>
      <PageHeader
        eyebrow="Workflow / Library"
        title="让每条执行路径都有自己的版本。"
        description="一个项目可以拥有多个工作流；节点、连线和画布位置都同步到云端。"
        icon={Workflow}
        actions={(
          <Button onClick={() => setCreating(true)}>
            <Plus />
            新建工作流
          </Button>
        )}
      />

      <div className="mb-4 flex items-center gap-3">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="搜索工作流…"
            className="pl-9"
          />
        </div>
        <Badge variant="outline" className="font-mono">
          {workflows.length} FLOWS
        </Badge>
      </div>

      {operationError ? (
        <p role="alert" className="mb-4 text-sm text-destructive">
          {operationError}
        </p>
      ) : null}

      {visible.length ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {visible.map((workflow) => {
            const project = projects.find((item) => item.id === workflow.projectId);
            const pending = pendingId === workflow.id;
            return (
              <Card key={workflow.id} className="group bg-card/70">
                <CardHeader>
                  <div className="flex items-start justify-between gap-3">
                    <Link href={`/workflows/${workflow.id}`} className="min-w-0 flex-1">
                      <CardTitle className="truncate transition-colors group-hover:text-primary">
                        {workflow.title}
                      </CardTitle>
                      <p className="mt-2 line-clamp-2 min-h-8 text-xs text-muted-foreground">
                        {workflow.description || "尚未添加说明"}
                      </p>
                    </Link>
                    {workflow.isDefault ? <Badge>DEFAULT</Badge> : null}
                  </div>
                </CardHeader>
                <CardContent>
                  <Link
                    href={`/workflows/${workflow.id}`}
                    className="flex items-center justify-between rounded-md border bg-background/30 px-3 py-2 text-xs"
                  >
                    <span className="flex items-center gap-2 text-muted-foreground">
                      <GitBranch className="size-3.5 text-primary" />
                      {project?.title ?? "独立工作流"}
                    </span>
                    <span className="font-mono text-[10px] text-muted-foreground">
                      V{workflow.version} · {formatUpdatedAt(workflow.updatedAt)}
                    </span>
                  </Link>
                  <div className="mt-4 flex gap-2">
                    <Button asChild size="sm" className="flex-1">
                      <Link href={`/workflows/${workflow.id}`}>打开画布</Link>
                    </Button>
                    <Button
                      size="icon-sm"
                      variant="outline"
                      aria-label={`复制 ${workflow.title}`}
                      disabled={pending}
                      onClick={() => void duplicate(workflow)}
                    >
                      {pending ? <LoaderCircle className="animate-spin" /> : <Copy />}
                    </Button>
                    <Button
                      size="icon-sm"
                      variant="outline"
                      aria-label={`删除 ${workflow.title}`}
                      disabled={pending}
                      onClick={() => setDeleting(workflow)}
                    >
                      <Trash2 />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card className="border-dashed bg-card/40">
          <CardContent className="grid min-h-64 place-items-center text-center">
            <div>
              <Workflow className="mx-auto size-8 text-primary" />
              <p className="mt-4 font-medium">
                {query ? "没有匹配的工作流" : "创建第一条云端工作流"}
              </p>
              <p className="mt-2 text-xs text-muted-foreground">
                每条工作流都会独立保存节点、连线和版本。
              </p>
              {!query ? (
                <Button className="mt-5" onClick={() => setCreating(true)}>
                  <Plus />
                  新建工作流
                </Button>
              ) : null}
            </div>
          </CardContent>
        </Card>
      )}

      <Dialog open={creating} onOpenChange={setCreating}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>新建工作流</DialogTitle>
            <DialogDescription>
              创建后会直接进入独立画布。
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="mb-2 block text-xs" htmlFor="workflow-title">
                名称
              </label>
              <Input
                id="workflow-title"
                autoFocus
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="例如：内容发布审批流"
              />
            </div>
            <div>
              <label className="mb-2 block text-xs" htmlFor="workflow-description">
                说明
              </label>
              <Input
                id="workflow-description"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="这条工作流负责什么？"
              />
            </div>
            <div>
              <label className="mb-2 block text-xs">关联项目</label>
              <Select value={projectId} onValueChange={setProjectId}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">不关联项目</SelectItem>
                  {projects.map((project) => (
                    <SelectItem key={project.id} value={project.id}>
                      {project.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {operationError ? (
              <p role="alert" className="text-sm text-destructive">
                {operationError}
              </p>
            ) : null}
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setCreating(false)}>
              取消
            </Button>
            <Button
              onClick={() => void submitCreate()}
              disabled={!title.trim() || pendingId === "create"}
            >
              {pendingId === "create" ? <LoaderCircle className="animate-spin" /> : <Plus />}
              创建并打开
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={Boolean(deleting)} onOpenChange={(open) => !open && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>删除工作流“{deleting?.title}”？</AlertDialogTitle>
            <AlertDialogDescription>
              节点与连线会一并永久删除，此操作无法撤销。
            </AlertDialogDescription>
          </AlertDialogHeader>
          {operationError ? (
            <p role="alert" className="text-sm text-destructive">
              {operationError}
            </p>
          ) : null}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={Boolean(pendingId)}>取消</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={Boolean(pendingId)}
              onClick={(event) => {
                event.preventDefault();
                void removeSelected();
              }}
            >
              {pendingId ? <LoaderCircle className="animate-spin" /> : <Trash2 />}
              删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
