"use client";

import { useMemo, useState } from "react";
import {
  ExternalLink,
  FileBox,
  KeyRound,
  Pencil,
  Plus,
  Search,
  ShieldCheck,
  Trash2,
} from "lucide-react";
import { useProjectOS } from "@/components/project-os/project-os-provider";
import { PageHeader } from "@/components/project-os/page-header";
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
import { Card, CardContent } from "@/components/ui/card";
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
import { Textarea } from "@/components/ui/textarea";
import type { ResourceItem, ResourceType } from "@/lib/project-os";

const typeLabel: Record<ResourceType, string> = {
  link: "链接",
  document: "文档",
  api: "API",
  tool: "工具",
  account: "账号",
  other: "其他",
};

const emptyResource = (): ResourceItem => ({
  id: crypto.randomUUID(),
  name: "",
  type: "link",
  notes: "",
  metadata: {},
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
});

function metadataToText(metadata: Record<string, string>) {
  return Object.entries(metadata).map(([key, value]) => `${key}=${value}`).join("\n");
}

function parseMetadata(value: string) {
  return Object.fromEntries(
    value.split("\n").map((line) => line.trim()).filter(Boolean).map((line) => {
      const index = line.indexOf("=");
      return index < 0 ? [line, ""] : [line.slice(0, index).trim(), line.slice(index + 1).trim()];
    }),
  );
}

export function ResourcesView() {
  const { resources, projects, saveResource, deleteResource } = useProjectOS();
  const [query, setQuery] = useState("");
  const [type, setType] = useState<ResourceType | "all">("all");
  const [editing, setEditing] = useState<ResourceItem>();
  const [metadataText, setMetadataText] = useState("");
  const [deleting, setDeleting] = useState<ResourceItem>();
  const [error, setError] = useState<string>();
  const [saving, setSaving] = useState(false);

  const filtered = useMemo(() => resources.filter((resource) => {
    const haystack = `${resource.name} ${resource.notes} ${resource.url ?? ""}`.toLowerCase();
    return (type === "all" || resource.type === type) && haystack.includes(query.toLowerCase());
  }), [query, resources, type]);

  function openEditor(resource: ResourceItem) {
    setError(undefined);
    setEditing(resource);
    setMetadataText(metadataToText(resource.metadata));
  }

  async function submit() {
    if (!editing) return;
    setSaving(true);
    setError(undefined);
    const result = await saveResource({ ...editing, metadata: parseMetadata(metadataText) });
    setSaving(false);
    if (!result.ok) return setError(result.error.message);
    setEditing(undefined);
  }

  return (
    <>
      <PageHeader
        eyebrow="Operational inventory / S6"
        title="Resource Center"
        description="集中管理链接、文档、API、工具与账号入口；密钥只保存引用，不保存明文。"
        icon={FileBox}
        actions={<Button onClick={() => openEditor(emptyResource())}><Plus /> 新建资源</Button>}
      />

      {error ? (
        <div role="alert" className="mb-5 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</div>
      ) : null}

      <div className="mb-5 grid gap-3 sm:grid-cols-[1fr_180px]">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input className="pl-9" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索名称、备注或 URL" />
        </div>
        <Select value={type} onValueChange={(value) => setType(value as ResourceType | "all")}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部类型</SelectItem>
            {Object.entries(typeLabel).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <Card className="border-dashed bg-card/45">
          <CardContent className="grid min-h-72 place-items-center text-center">
            <div>
              <FileBox className="mx-auto size-9 text-muted-foreground/45" />
              <p className="mt-4 text-sm font-medium">{resources.length ? "没有匹配的资源" : "资源中心还是空的"}</p>
              <p className="mt-1 text-xs text-muted-foreground">保存常用入口，但不要粘贴 API Key 或密码。</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((resource) => {
            const project = projects.find((item) => item.id === resource.projectId);
            return (
              <Card key={resource.id} className="group bg-card/70">
                <CardContent className="p-5">
                  <div className="flex items-start gap-3">
                    <div className="grid size-10 shrink-0 place-items-center rounded-lg border bg-primary/8 text-primary">
                      {resource.secretRef ? <KeyRound className="size-4" /> : <FileBox className="size-4" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="truncate text-sm font-medium">{resource.name}</p>
                          <div className="mt-2 flex flex-wrap gap-1.5">
                            <Badge variant="outline">{typeLabel[resource.type]}</Badge>
                            {project ? <Badge variant="secondary">{project.title}</Badge> : null}
                          </div>
                        </div>
                        <div className="flex">
                          <Button size="icon-sm" variant="ghost" aria-label={`编辑 ${resource.name}`} onClick={() => openEditor(resource)}><Pencil /></Button>
                          <Button size="icon-sm" variant="ghost" aria-label={`删除 ${resource.name}`} onClick={() => setDeleting(resource)}><Trash2 /></Button>
                        </div>
                      </div>
                      <p className="mt-4 line-clamp-2 min-h-10 text-xs leading-5 text-muted-foreground">{resource.notes || "暂无备注"}</p>
                      <div className="mt-4 flex items-center justify-between border-t pt-3">
                        <span className="font-mono text-[9px] text-muted-foreground">
                          {resource.secretRef ? `SECRET: ${resource.secretRef}` : `${Object.keys(resource.metadata).length} META`}
                        </span>
                        {resource.url ? (
                          <Button asChild size="sm" variant="ghost">
                            <a href={resource.url} target="_blank" rel="noreferrer">打开 <ExternalLink /></a>
                          </Button>
                        ) : null}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={Boolean(editing)} onOpenChange={(open) => !open && setEditing(undefined)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing && resources.some((resource) => resource.id === editing.id) ? "编辑资源" : "新建资源"}</DialogTitle>
            <DialogDescription>只保存入口和说明。API Key、Token、密码必须留在 Vercel 或 Supabase Secrets。</DialogDescription>
          </DialogHeader>
          {editing ? (
            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="space-y-2 text-sm">名称
                  <Input autoFocus value={editing.name} onChange={(event) => setEditing({ ...editing, name: event.target.value })} />
                </label>
                <label className="space-y-2 text-sm">类型
                  <Select value={editing.type} onValueChange={(value) => setEditing({ ...editing, type: value as ResourceType })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(typeLabel).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </label>
              </div>
              <label className="space-y-2 text-sm">关联项目
                <Select value={editing.projectId ?? "none"} onValueChange={(value) => setEditing({ ...editing, projectId: value === "none" ? undefined : value })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">不关联项目</SelectItem>
                    {projects.map((project) => <SelectItem key={project.id} value={project.id}>{project.title}</SelectItem>)}
                  </SelectContent>
                </Select>
              </label>
              <label className="space-y-2 text-sm">URL
                <Input type="url" value={editing.url ?? ""} onChange={(event) => setEditing({ ...editing, url: event.target.value || undefined })} placeholder="https://" />
              </label>
              <label className="space-y-2 text-sm">备注
                <Textarea value={editing.notes} onChange={(event) => setEditing({ ...editing, notes: event.target.value })} placeholder="用途、使用说明、负责人等；不要写入密钥。" />
              </label>
              <div className="rounded-lg border border-primary/20 bg-primary/5 p-3">
                <div className="flex gap-2 text-xs font-medium"><ShieldCheck className="size-4 text-primary" /> Secret Ref</div>
                <p className="mt-1 text-xs text-muted-foreground">填写环境变量名称或秘密托管位置，例如 Vercel: OPENAI_API_KEY。</p>
                <Input className="mt-3" value={editing.secretRef ?? ""} onChange={(event) => setEditing({ ...editing, secretRef: event.target.value || undefined })} placeholder="Vercel: SERVICE_API_KEY" />
              </div>
              <label className="space-y-2 text-sm">元数据（每行 key=value）
                <Textarea value={metadataText} onChange={(event) => setMetadataText(event.target.value)} placeholder={"owner=产品组\nversion=v1"} />
              </label>
            </div>
          ) : null}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(undefined)}>取消</Button>
            <Button disabled={saving || !editing?.name.trim()} onClick={() => void submit()}>{saving ? "保存中…" : "保存资源"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={Boolean(deleting)} onOpenChange={(open) => !open && setDeleting(undefined)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>删除资源“{deleting?.name}”？</AlertDialogTitle>
            <AlertDialogDescription>该操作无法撤销，但不会删除外部网站、文档或秘密托管系统中的内容。</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={async () => {
              if (!deleting) return;
              const result = await deleteResource(deleting.id);
              if (!result.ok) setError(result.error.message);
              setDeleting(undefined);
            }}>确认删除</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
