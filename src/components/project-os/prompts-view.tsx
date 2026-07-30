"use client";

import { useMemo, useState } from "react";
import {
  Braces,
  Copy,
  FileCode2,
  LoaderCircle,
  MoreHorizontal,
  Pencil,
  Plus,
  Search,
  Trash2,
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
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { PageHeader } from "@/components/project-os/page-header";
import { useProjectOS } from "@/components/project-os/project-os-provider";
import type { PromptAsset } from "@/lib/project-os";
import { detectPromptVariables, parsePromptTags } from "@/lib/prompts";

interface PromptDraft {
  id?: string;
  title: string;
  description: string;
  projectId?: string;
  tags: string;
  content: string;
  model: string;
  notes: string;
  original?: PromptAsset;
}

const emptyDraft: PromptDraft = {
  title: "",
  description: "",
  tags: "",
  content: "",
  model: "",
  notes: "",
};

function draftFromPrompt(prompt: PromptAsset): PromptDraft {
  return {
    id: prompt.id,
    title: prompt.title,
    description: prompt.description,
    projectId: prompt.projectId,
    tags: prompt.tags.join(", "),
    content: prompt.currentVersion?.content ?? "",
    model: prompt.currentVersion?.model ?? "",
    notes: prompt.currentVersion?.notes ?? "",
    original: prompt,
  };
}

export function PromptsView() {
  const {
    prompts,
    projects,
    createPrompt,
    updatePrompt,
    publishPromptVersion,
    deletePrompt,
  } = useProjectOS();
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<PromptDraft | null>(null);
  const [deleting, setDeleting] = useState<PromptAsset | null>(null);
  const [pending, setPending] = useState(false);
  const [operationError, setOperationError] = useState<string>();
  const [copiedId, setCopiedId] = useState<string>();

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return prompts;
    return prompts.filter((prompt) => [
      prompt.title,
      prompt.description,
      prompt.tags.join(" "),
      prompt.currentVersion?.content ?? "",
    ].join(" ").toLowerCase().includes(needle));
  }, [prompts, query]);

  const variables = useMemo(
    () => detectPromptVariables(editing?.content ?? ""),
    [editing?.content],
  );

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!editing?.title.trim() || !editing.content.trim()) return;
    setPending(true);
    setOperationError(undefined);

    if (!editing.id) {
      const result = await createPrompt({
        id: crypto.randomUUID(),
        projectId: editing.projectId,
        title: editing.title.trim(),
        description: editing.description,
        tags: parsePromptTags(editing.tags),
        content: editing.content,
        model: editing.model,
        variables,
        notes: editing.notes,
      });
      setPending(false);
      if (result.ok) setEditing(null);
      else setOperationError(result.error.message);
      return;
    }

    const original = editing.original!;
    const metadata = await updatePrompt({
      ...original,
      title: editing.title.trim(),
      description: editing.description,
      projectId: editing.projectId,
      tags: parsePromptTags(editing.tags),
    });
    if (!metadata.ok) {
      setPending(false);
      setOperationError(metadata.error.message);
      return;
    }

    const current = original.currentVersion;
    const versionChanged = !current
      || current.content !== editing.content
      || current.model !== editing.model
      || current.notes !== editing.notes
      || current.variables.join("\u0000") !== variables.join("\u0000");
    const version = versionChanged
      ? await publishPromptVersion(editing.id, {
          content: editing.content,
          model: editing.model,
          variables,
          notes: editing.notes,
        })
      : metadata;
    setPending(false);
    if (version.ok) setEditing(null);
    else setOperationError(version.error.message);
  };

  const removeSelected = async () => {
    if (!deleting) return;
    setPending(true);
    setOperationError(undefined);
    const result = await deletePrompt(deleting.id);
    setPending(false);
    if (result.ok) setDeleting(null);
    else setOperationError(result.error.message);
  };

  const copyContent = async (prompt: PromptAsset) => {
    await navigator.clipboard.writeText(prompt.currentVersion?.content ?? "");
    setCopiedId(prompt.id);
    window.setTimeout(() => setCopiedId(undefined), 1_500);
  };

  return (
    <>
      <PageHeader
        eyebrow="Prompts / Versioned assets"
        title="把 Prompt 变成可追踪的生产资产。"
        description="集中管理正文、变量和模型配置；发布新版本不会覆盖历史内容。"
        icon={FileCode2}
        actions={(
          <Button onClick={() => setEditing({ ...emptyDraft })}>
            <Plus />创建 Prompt
          </Button>
        )}
      />

      <div className="mb-5 flex items-center gap-3">
        <div className="relative max-w-md flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="搜索标题、标签或 Prompt 正文…"
            className="pl-9"
          />
        </div>
        <Badge variant="outline" className="h-9 px-3 font-mono text-[10px]">
          {filtered.length} PROMPTS
        </Badge>
      </div>

      <div className="grid gap-3 lg:grid-cols-2 2xl:grid-cols-3">
        {filtered.map((prompt) => (
          <Card key={prompt.id} className="bg-card/70 transition-colors hover:border-primary/25">
            <CardContent className="p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="secondary" className="font-mono text-[9px]">
                      V{prompt.currentVersion?.version ?? 0}
                    </Badge>
                    {prompt.projectId ? (
                      <span className="truncate text-[10px] text-muted-foreground">
                        {projects.find((project) => project.id === prompt.projectId)?.title}
                      </span>
                    ) : null}
                  </div>
                  <h2 className="mt-3 truncate font-semibold">{prompt.title}</h2>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button size="icon-sm" variant="ghost" aria-label="Prompt 操作">
                      <MoreHorizontal />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => setEditing(draftFromPrompt(prompt))}>
                      <Pencil />编辑或发布新版本
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => void copyContent(prompt)}>
                      <Copy />复制正文
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => setDeleting(prompt)}>
                      <Trash2 />删除
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              <p className="mt-4 line-clamp-2 min-h-10 text-sm leading-5 text-muted-foreground">
                {prompt.description || "暂无描述"}
              </p>
              <div className="mt-4 flex min-h-6 flex-wrap gap-1.5">
                {prompt.tags.slice(0, 4).map((tag) => (
                  <Badge key={tag} variant="outline" className="text-[9px]">#{tag}</Badge>
                ))}
              </div>
              <div className="mt-5 flex items-center justify-between border-t pt-3 text-[10px] text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <Braces className="size-3" />
                  {prompt.currentVersion?.variables.length ?? 0} VARIABLES
                </span>
                <Button
                  size="xs"
                  variant="ghost"
                  onClick={() => void copyContent(prompt)}
                >
                  <Copy />{copiedId === prompt.id ? "已复制" : "复制"}
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
        {filtered.length === 0 ? (
          <Card className="col-span-full border-dashed bg-transparent">
            <CardContent className="grid min-h-52 place-items-center text-center">
              <div>
                <FileCode2 className="mx-auto mb-3 size-8 text-muted-foreground" />
                <p className="text-sm font-medium">
                  {query ? "没有匹配 Prompt" : "还没有 Prompt"}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {query ? "换一个关键词试试。" : "创建第一个可版本化 Prompt。"}
                </p>
              </div>
            </CardContent>
          </Card>
        ) : null}
      </div>

      <Dialog open={!!editing} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editing?.id ? "编辑 Prompt" : "创建 Prompt"}</DialogTitle>
            <DialogDescription>
              修改正文、模型或备注会发布新版本；只修改元数据不会增加版本号。
            </DialogDescription>
          </DialogHeader>
          {editing ? (
            <form onSubmit={submit} className="space-y-4">
              <div>
                <label className="mb-2 block text-xs font-medium">标题</label>
                <Input
                  autoFocus
                  value={editing.title}
                  onChange={(event) => setEditing({ ...editing, title: event.target.value })}
                  placeholder="例如：需求拆解 Prompt"
                />
              </div>
              <div>
                <label className="mb-2 block text-xs font-medium">描述</label>
                <Input
                  value={editing.description}
                  onChange={(event) => setEditing({ ...editing, description: event.target.value })}
                  placeholder="这个 Prompt 解决什么问题？"
                />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-2 block text-xs font-medium">关联项目</label>
                  <Select
                    value={editing.projectId ?? "none"}
                    onValueChange={(value) => setEditing({
                      ...editing,
                      projectId: value === "none" ? undefined : value,
                    })}
                  >
                    <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">不关联项目</SelectItem>
                      {projects.map((project) => (
                        <SelectItem key={project.id} value={project.id}>{project.title}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="mb-2 block text-xs font-medium">模型</label>
                  <Input
                    value={editing.model}
                    onChange={(event) => setEditing({ ...editing, model: event.target.value })}
                    placeholder="例如：gpt-5"
                  />
                </div>
              </div>
              <div>
                <label className="mb-2 block text-xs font-medium">标签</label>
                <Input
                  value={editing.tags}
                  onChange={(event) => setEditing({ ...editing, tags: event.target.value })}
                  placeholder="用逗号分隔，例如：开发, 规划"
                />
              </div>
              <div>
                <label className="mb-2 block text-xs font-medium">Prompt 正文</label>
                <Textarea
                  value={editing.content}
                  onChange={(event) => setEditing({ ...editing, content: event.target.value })}
                  placeholder="使用 {{variable}} 声明变量"
                  className="min-h-52 font-mono text-xs"
                />
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {variables.length ? variables.map((variable) => (
                    <Badge key={variable} variant="outline" className="font-mono text-[9px]">
                      {`{{${variable}}}`}
                    </Badge>
                  )) : (
                    <span className="text-xs text-muted-foreground">未检测到变量</span>
                  )}
                </div>
              </div>
              <div>
                <label className="mb-2 block text-xs font-medium">测试备注</label>
                <Textarea
                  value={editing.notes}
                  onChange={(event) => setEditing({ ...editing, notes: event.target.value })}
                  placeholder="记录适用场景或测试结论"
                  className="min-h-20"
                />
              </div>
              {operationError ? (
                <p role="alert" className="text-sm text-destructive">{operationError}</p>
              ) : null}
              <DialogFooter>
                <Button type="button" variant="ghost" onClick={() => setEditing(null)} disabled={pending}>
                  取消
                </Button>
                <Button type="submit" disabled={pending || !editing.title.trim() || !editing.content.trim()}>
                  {pending ? <LoaderCircle className="animate-spin" /> : null}
                  {editing.id ? "保存 / 发布新版本" : "创建并发布 v1"}
                </Button>
              </DialogFooter>
            </form>
          ) : null}
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleting} onOpenChange={(open) => !open && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>删除“{deleting?.title}”？</AlertDialogTitle>
            <AlertDialogDescription>
              Prompt 及全部历史版本将永久删除，此操作无法撤销。
            </AlertDialogDescription>
          </AlertDialogHeader>
          {operationError ? <p role="alert" className="text-sm text-destructive">{operationError}</p> : null}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending}>取消</AlertDialogCancel>
            <AlertDialogAction
              disabled={pending}
              onClick={(event) => {
                event.preventDefault();
                void removeSelected();
              }}
            >
              {pending ? <LoaderCircle className="animate-spin" /> : <Trash2 />}
              永久删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
