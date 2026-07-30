"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  Archive,
  BookOpenText,
  ExternalLink,
  FileText,
  Lightbulb,
  LoaderCircle,
  MoreHorizontal,
  Pencil,
  Plus,
  Search,
  ShieldCheck,
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
import type {
  KnowledgeItem,
  KnowledgeType,
} from "@/lib/project-os";
import { parsePromptTags } from "@/lib/prompts";

const typeMeta: Record<KnowledgeType, {
  label: string;
  icon: typeof FileText;
  tone: string;
}> = {
  note: { label: "笔记", icon: FileText, tone: "text-sky-300" },
  decision: { label: "决策", icon: ShieldCheck, tone: "text-emerald-300" },
  lesson: { label: "经验", icon: Lightbulb, tone: "text-amber-300" },
  reference: { label: "参考", icon: BookOpenText, tone: "text-violet-300" },
};

interface KnowledgeDraft {
  id?: string;
  projectId?: string;
  title: string;
  content: string;
  type: KnowledgeType;
  tags: string;
  sourceUrl: string;
  original?: KnowledgeItem;
}

const emptyDraft: KnowledgeDraft = {
  title: "",
  content: "",
  type: "note",
  tags: "",
  sourceUrl: "",
};

function draftFromItem(item: KnowledgeItem): KnowledgeDraft {
  return {
    id: item.id,
    projectId: item.projectId,
    title: item.title,
    content: item.content,
    type: item.type,
    tags: item.tags.join(", "),
    sourceUrl: item.sourceUrl ?? "",
    original: item,
  };
}

export function KnowledgeView() {
  const {
    knowledge,
    projects,
    saveKnowledge,
    archiveKnowledge,
    deleteKnowledge,
  } = useProjectOS();
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<KnowledgeType | "all">("all");
  const [editing, setEditing] = useState<KnowledgeDraft | null>(null);
  const [archiving, setArchiving] = useState<KnowledgeItem | null>(null);
  const [deleting, setDeleting] = useState<KnowledgeItem | null>(null);
  const [pending, setPending] = useState(false);
  const [operationError, setOperationError] = useState<string>();

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return knowledge.filter((item) => {
      if (typeFilter !== "all" && item.type !== typeFilter) return false;
      if (!needle) return true;
      return [
        item.title,
        item.content,
        item.tags.join(" "),
        item.sourceUrl ?? "",
      ].join(" ").toLowerCase().includes(needle);
    });
  }, [knowledge, query, typeFilter]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!editing?.title.trim()) return;
    setPending(true);
    setOperationError(undefined);
    const now = new Date().toISOString();
    const result = await saveKnowledge({
      id: editing.id ?? crypto.randomUUID(),
      projectId: editing.projectId,
      title: editing.title.trim(),
      content: editing.content,
      type: editing.type,
      tags: parsePromptTags(editing.tags),
      sourceUrl: editing.sourceUrl.trim() || undefined,
      createdAt: editing.original?.createdAt ?? now,
      updatedAt: now,
    });
    setPending(false);
    if (result.ok) setEditing(null);
    else setOperationError(result.error.message);
  };

  const archiveSelected = async () => {
    if (!archiving) return;
    setPending(true);
    setOperationError(undefined);
    const result = await archiveKnowledge(archiving.id);
    setPending(false);
    if (result.ok) setArchiving(null);
    else setOperationError(result.error.message);
  };

  const deleteSelected = async () => {
    if (!deleting) return;
    setPending(true);
    setOperationError(undefined);
    const result = await deleteKnowledge(deleting.id);
    setPending(false);
    if (result.ok) setDeleting(null);
    else setOperationError(result.error.message);
  };

  return (
    <>
      <PageHeader
        eyebrow="Knowledge / Working memory"
        title="让每一次决策和经验都能被重新找到。"
        description="保存笔记、决策、经验与参考资料，并与正在推进的项目建立上下文。"
        icon={BookOpenText}
        actions={(
          <Button onClick={() => setEditing({ ...emptyDraft })}>
            <Plus />新增知识
          </Button>
        )}
      />

      <div className="mb-5 flex flex-col gap-3 sm:flex-row">
        <div className="relative max-w-md flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="搜索标题、正文、标签或来源…"
            className="pl-9"
          />
        </div>
        <Select
          value={typeFilter}
          onValueChange={(value) => setTypeFilter(value as KnowledgeType | "all")}
        >
          <SelectTrigger className="w-full sm:w-36"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部类型</SelectItem>
            {Object.entries(typeMeta).map(([value, meta]) => (
              <SelectItem key={value} value={value}>{meta.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Badge variant="outline" className="h-9 justify-center px-3 font-mono text-[10px]">
          {filtered.length} ITEMS
        </Badge>
      </div>

      <div className="grid gap-3 lg:grid-cols-2 2xl:grid-cols-3">
        {filtered.map((item) => {
          const meta = typeMeta[item.type];
          const TypeIcon = meta.icon;
          const project = projects.find((candidate) => candidate.id === item.projectId);
          return (
            <Card key={item.id} className="group overflow-hidden bg-card/70 transition-colors hover:border-primary/25">
              <div className="grid grid-cols-[4px_1fr]">
                <div className="bg-gradient-to-b from-primary/80 to-primary/10" />
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <Badge variant="outline" className={`${meta.tone} text-[9px]`}>
                        <TypeIcon />{meta.label}
                      </Badge>
                      <h2 className="mt-3 truncate font-semibold">{item.title}</h2>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button size="icon-sm" variant="ghost" aria-label="知识条目操作">
                          <MoreHorizontal />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setEditing(draftFromItem(item))}>
                          <Pencil />编辑
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setArchiving(item)}>
                          <Archive />归档
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => setDeleting(item)}>
                          <Trash2 />永久删除
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  <p className="mt-4 line-clamp-3 min-h-15 whitespace-pre-wrap text-sm leading-5 text-muted-foreground">
                    {item.content || "暂无正文"}
                  </p>
                  <div className="mt-4 flex min-h-6 flex-wrap gap-1.5">
                    {item.tags.slice(0, 4).map((tag) => (
                      <Badge key={tag} variant="secondary" className="text-[9px]">#{tag}</Badge>
                    ))}
                  </div>
                  <div className="mt-5 flex min-w-0 items-center gap-3 border-t pt-3 text-[10px] text-muted-foreground">
                    {project ? (
                      <Link href={`/projects/${project.id}`} className="truncate hover:text-primary">
                        {project.title}
                      </Link>
                    ) : <span>未关联项目</span>}
                    {item.sourceUrl ? (
                      <a
                        href={item.sourceUrl}
                        target="_blank"
                        rel="noreferrer noopener"
                        className="ms-auto flex shrink-0 items-center gap-1 hover:text-primary"
                      >
                        来源<ExternalLink className="size-3" />
                      </a>
                    ) : null}
                  </div>
                </CardContent>
              </div>
            </Card>
          );
        })}

        {filtered.length === 0 ? (
          <Card className="col-span-full border-dashed bg-transparent">
            <CardContent className="grid min-h-52 place-items-center text-center">
              <div>
                <BookOpenText className="mx-auto mb-3 size-8 text-muted-foreground" />
                <p className="text-sm font-medium">
                  {query || typeFilter !== "all" ? "没有匹配知识" : "知识库还是空的"}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {query || typeFilter !== "all"
                    ? "调整搜索词或类型筛选。"
                    : "记录第一条值得长期保留的信息。"}
                </p>
              </div>
            </CardContent>
          </Card>
        ) : null}
      </div>

      <Dialog open={!!editing} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editing?.id ? "编辑知识" : "新增知识"}</DialogTitle>
            <DialogDescription>
              正文以纯文本保存，不执行 HTML；来源链接将在新标签页打开。
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
                  placeholder="例如：为什么采用服务端版本发布事务"
                />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-2 block text-xs font-medium">类型</label>
                  <Select
                    value={editing.type}
                    onValueChange={(value) => setEditing({
                      ...editing,
                      type: value as KnowledgeType,
                    })}
                  >
                    <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(typeMeta).map(([value, meta]) => (
                        <SelectItem key={value} value={value}>{meta.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
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
              </div>
              <div>
                <label className="mb-2 block text-xs font-medium">正文</label>
                <Textarea
                  value={editing.content}
                  onChange={(event) => setEditing({ ...editing, content: event.target.value })}
                  placeholder="记录背景、结论和以后需要复用的信息…"
                  className="min-h-60"
                />
              </div>
              <div>
                <label className="mb-2 block text-xs font-medium">标签</label>
                <Input
                  value={editing.tags}
                  onChange={(event) => setEditing({ ...editing, tags: event.target.value })}
                  placeholder="用逗号分隔，例如：架构, Supabase"
                />
              </div>
              <div>
                <label className="mb-2 block text-xs font-medium">来源 URL（可选）</label>
                <Input
                  type="url"
                  value={editing.sourceUrl}
                  onChange={(event) => setEditing({ ...editing, sourceUrl: event.target.value })}
                  placeholder="https://..."
                />
              </div>
              {operationError ? (
                <p role="alert" className="text-sm text-destructive">{operationError}</p>
              ) : null}
              <DialogFooter>
                <Button type="button" variant="ghost" disabled={pending} onClick={() => setEditing(null)}>
                  取消
                </Button>
                <Button type="submit" disabled={pending || !editing.title.trim()}>
                  {pending ? <LoaderCircle className="animate-spin" /> : null}
                  保存知识
                </Button>
              </DialogFooter>
            </form>
          ) : null}
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!archiving} onOpenChange={(open) => !open && setArchiving(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>归档“{archiving?.title}”？</AlertDialogTitle>
            <AlertDialogDescription>
              条目会从当前知识库隐藏，但仍保留在云端。
            </AlertDialogDescription>
          </AlertDialogHeader>
          {operationError ? <p role="alert" className="text-sm text-destructive">{operationError}</p> : null}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending}>取消</AlertDialogCancel>
            <AlertDialogAction
              disabled={pending}
              onClick={(event) => {
                event.preventDefault();
                void archiveSelected();
              }}
            >
              {pending ? <LoaderCircle className="animate-spin" /> : <Archive />}
              确认归档
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!deleting} onOpenChange={(open) => !open && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>永久删除“{deleting?.title}”？</AlertDialogTitle>
            <AlertDialogDescription>此操作无法撤销。</AlertDialogDescription>
          </AlertDialogHeader>
          {operationError ? <p role="alert" className="text-sm text-destructive">{operationError}</p> : null}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending}>取消</AlertDialogCancel>
            <AlertDialogAction
              disabled={pending}
              onClick={(event) => {
                event.preventDefault();
                void deleteSelected();
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
