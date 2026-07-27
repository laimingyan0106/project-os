"use client";

import { useMemo, useState } from "react";
import { Check, Inbox, Lightbulb, MoreHorizontal, Pencil, Plus, Search, StickyNote, Trash2 } from "lucide-react";
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
import type { InboxItem } from "@/lib/project-os";

const blank: InboxItem = { id: "", title: "", content: "", kind: "idea", processed: false, createdAt: "刚刚" };
const kindMeta = { idea: { label: "想法", icon: Lightbulb, tone: "text-primary" }, task: { label: "任务", icon: Check, tone: "text-sky-300" }, note: { label: "笔记", icon: StickyNote, tone: "text-violet-300" } };

export function InboxView() {
  const { inbox, saveInboxItem, deleteInboxItem } = useProjectOS();
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<InboxItem | null>(null);
  const [deleting, setDeleting] = useState<InboxItem | null>(null);
  const filtered = useMemo(() => inbox.filter((item) => `${item.title} ${item.content}`.toLowerCase().includes(query.toLowerCase())), [inbox, query]);
  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!editing?.title.trim()) return;
    saveInboxItem({ ...editing, id: editing.id || crypto.randomUUID(), title: editing.title.trim() });
    setEditing(null);
  };

  return (
    <>
      <PageHeader eyebrow="Inbox / Capture" title="先收集，再决定。"
        description="把突然出现的想法、任务和资料放在这里。收件箱只负责不遗漏，不负责永久保存。"
        icon={Inbox} actions={<Button onClick={() => setEditing({ ...blank })}><Plus />快速收集</Button>} />
      <div className="mb-5 flex items-center gap-3"><div className="relative max-w-sm flex-1"><Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="搜索收件箱…" className="pl-9" /></div><Badge variant="outline">{inbox.filter((i) => !i.processed).length} 待处理</Badge></div>
      <Card className="overflow-hidden bg-card/70">
        <CardContent className="p-0">
          {filtered.map((item) => {
            const meta = kindMeta[item.kind];
            return (
              <div key={item.id} className="group grid grid-cols-[36px_1fr_auto] gap-3 border-b p-4 last:border-0 hover:bg-background/35">
                <div className="grid size-9 place-items-center rounded-lg border bg-background"><meta.icon className={`size-4 ${meta.tone}`} /></div>
                <div className="min-w-0"><div className="flex items-center gap-2"><h2 className={`truncate text-sm font-medium ${item.processed ? "text-muted-foreground line-through" : ""}`}>{item.title}</h2><Badge variant="secondary" className="text-[9px]">{meta.label}</Badge></div><p className="mt-1.5 line-clamp-2 text-xs leading-5 text-muted-foreground">{item.content}</p><p className="mt-2 font-mono text-[9px] uppercase text-muted-foreground/60">{item.createdAt}</p></div>
                <DropdownMenu><DropdownMenuTrigger asChild><Button size="icon-sm" variant="ghost" aria-label="收件箱操作"><MoreHorizontal /></Button></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuItem onClick={() => saveInboxItem({ ...item, processed: !item.processed })}><Check />{item.processed ? "标为未处理" : "完成处理"}</DropdownMenuItem><DropdownMenuItem onClick={() => setEditing(item)}><Pencil />编辑</DropdownMenuItem><DropdownMenuSeparator /><DropdownMenuItem variant="destructive" onClick={() => setDeleting(item)}><Trash2 />删除</DropdownMenuItem></DropdownMenuContent></DropdownMenu>
              </div>
            );
          })}
          {filtered.length === 0 && <div className="grid min-h-56 place-items-center text-center"><div><Inbox className="mx-auto mb-3 size-8 text-muted-foreground" /><p className="text-sm">收件箱很安静。</p></div></div>}
        </CardContent>
      </Card>
      <Dialog open={!!editing} onOpenChange={(open) => !open && setEditing(null)}><DialogContent><DialogHeader><DialogTitle>{editing?.id ? "编辑收集项" : "快速收集"}</DialogTitle><DialogDescription>先捕捉原始想法，之后再归档到项目或知识库。</DialogDescription></DialogHeader>
        {editing && <form onSubmit={submit} className="space-y-4"><div><label className="mb-2 block text-xs">标题</label><Input autoFocus value={editing.title} onChange={(e) => setEditing({ ...editing, title: e.target.value })} placeholder="刚刚想到了什么？" /></div><div><label className="mb-2 block text-xs">内容</label><Textarea value={editing.content} onChange={(e) => setEditing({ ...editing, content: e.target.value })} placeholder="补充背景、下一步或链接…" className="min-h-28" /></div><div><label className="mb-2 block text-xs">类型</label><Select value={editing.kind} onValueChange={(value) => setEditing({ ...editing, kind: value as InboxItem["kind"] })}><SelectTrigger className="w-full"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="idea">想法</SelectItem><SelectItem value="task">任务</SelectItem><SelectItem value="note">笔记</SelectItem></SelectContent></Select></div><DialogFooter><Button type="button" variant="ghost" onClick={() => setEditing(null)}>取消</Button><Button type="submit">保存</Button></DialogFooter></form>}
      </DialogContent></Dialog>
      <AlertDialog open={!!deleting} onOpenChange={(open) => !open && setDeleting(null)}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>删除这条收集？</AlertDialogTitle><AlertDialogDescription>“{deleting?.title}”将从本地收件箱永久移除。</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>取消</AlertDialogCancel><AlertDialogAction variant="destructive" onClick={() => { if (deleting) deleteInboxItem(deleting.id); setDeleting(null); }}>删除</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
    </>
  );
}
