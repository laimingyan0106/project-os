"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  ArrowLeft,
  Bot,
  CalendarDays,
  FolderKanban,
  LoaderCircle,
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
import { PageHeader } from "@/components/project-os/page-header";
import { useProjectOS } from "@/components/project-os/project-os-provider";
import type { Project } from "@/lib/project-os";

const statusLabels = {
  active: "进行中",
  planning: "规划中",
  blocked: "受阻",
  done: "已完成",
};

export function ProjectDetailView({ initialProject }: { initialProject: Project }) {
  const router = useRouter();
  const { projects, agents, removeProject } = useProjectOS();
  const project = projects.find((item) => item.id === initialProject.id) ?? initialProject;
  const relatedAgents = agents.filter((agent) => agent.projectId === project.id);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string>();

  const permanentlyDelete = async () => {
    setPending(true);
    setError(undefined);
    const result = await removeProject(project.id);
    setPending(false);
    if (result.ok) {
      router.replace("/projects");
      router.refresh();
    } else {
      setError(result.error.message);
    }
  };

  return (
    <>
      <div className="mb-4">
        <Button asChild variant="ghost" size="sm">
          <Link href="/projects"><ArrowLeft />返回项目列表</Link>
        </Button>
      </div>
      <PageHeader
        eyebrow="Projects / Detail"
        title={project.title}
        description={project.goal || "这个项目还没有填写目标。"}
        icon={FolderKanban}
        actions={
          <div className="flex items-center gap-2">
            <Badge variant="outline">{statusLabels[project.status]}</Badge>
            <Badge variant="secondary">{project.priority.toUpperCase()}</Badge>
          </div>
        }
      />

      <div className="grid gap-4 lg:grid-cols-[1.5fr_1fr]">
        <Card className="bg-card/70">
          <CardHeader><CardTitle>项目概览</CardTitle></CardHeader>
          <CardContent className="space-y-5">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">目标</p>
              <p className="mt-2 text-sm leading-6">{project.goal || "暂无目标"}</p>
            </div>
            <div>
              <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">说明</p>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-muted-foreground">{project.description || "暂无补充说明"}</p>
            </div>
            <div className="flex items-center gap-2 border-t pt-4 text-xs text-muted-foreground">
              <CalendarDays className="size-4" />
              {project.dueDate ? `截止日期 ${project.dueDate}` : "未设置截止日期"}
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card className="bg-card/70">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div><p className="text-sm font-medium">关联 Agent</p><p className="mt-1 text-xs text-muted-foreground">负责这个项目的配置角色</p></div>
                <div className="flex items-center gap-2 text-lg font-semibold"><Bot className="size-4 text-primary" />{relatedAgents.length}</div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-card/70">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div><p className="text-sm font-medium">关联工作流</p><p className="mt-1 text-xs text-muted-foreground">多工作流云端化将在 S3 完成</p></div>
                <Workflow className="size-5 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <Card className="mt-6 border-destructive/25 bg-destructive/5">
        <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div><p className="text-sm font-medium text-destructive">危险操作</p><p className="mt-1 text-xs text-muted-foreground">永久删除会移除项目记录，无法撤销。</p></div>
          <Button variant="destructive" onClick={() => setConfirmDelete(true)}><Trash2 />永久删除项目</Button>
        </CardContent>
      </Card>

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>永久删除“{project.title}”？</AlertDialogTitle>
            <AlertDialogDescription>该操作无法撤销。关联记录将按照数据库约束解除或删除。</AlertDialogDescription>
          </AlertDialogHeader>
          {error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending}>取消</AlertDialogCancel>
            <AlertDialogAction variant="destructive" disabled={pending} onClick={(event) => { event.preventDefault(); void permanentlyDelete(); }}>
              {pending ? <LoaderCircle className="animate-spin" /> : <Trash2 />}永久删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
