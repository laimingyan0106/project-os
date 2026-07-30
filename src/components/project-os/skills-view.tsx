"use client";

import { useMemo, useState } from "react";
import {
  Activity,
  Award,
  ChevronRight,
  GitBranch,
  Pencil,
  Plus,
  Sparkles,
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
import { Textarea } from "@/components/ui/textarea";
import type { Skill } from "@/lib/project-os";
import { buildSkillTree, flattenSkillTree } from "@/lib/s6";

const emptySkill = (): Skill => ({
  id: crypto.randomUUID(),
  name: "",
  level: 1,
  experience: 0,
  description: "",
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
});

export function SkillsView() {
  const {
    skills,
    skillEvents,
    projects,
    saveSkill,
    addSkillExperience,
    deleteSkill,
  } = useProjectOS();
  const tree = useMemo(() => flattenSkillTree(buildSkillTree(skills)), [skills]);
  const [editing, setEditing] = useState<Skill>();
  const [experienceSkill, setExperienceSkill] = useState<Skill>();
  const [deleting, setDeleting] = useState<Skill>();
  const [delta, setDelta] = useState("10");
  const [reason, setReason] = useState("");
  const [projectId, setProjectId] = useState("none");
  const [error, setError] = useState<string>();
  const [saving, setSaving] = useState(false);

  async function submitSkill() {
    if (!editing) return;
    setSaving(true);
    setError(undefined);
    const result = await saveSkill(editing);
    setSaving(false);
    if (!result.ok) return setError(result.error.message);
    setEditing(undefined);
  }

  async function submitExperience() {
    if (!experienceSkill) return;
    setSaving(true);
    setError(undefined);
    const result = await addSkillExperience({
      skillId: experienceSkill.id,
      projectId: projectId === "none" ? undefined : projectId,
      delta: Number(delta),
      reason,
    });
    setSaving(false);
    if (!result.ok) return setError(result.error.message);
    setExperienceSkill(undefined);
    setReason("");
    setDelta("10");
  }

  return (
    <>
      <PageHeader
        eyebrow="Capability map / S6"
        title="Skill Tree"
        description="用父子技能构建能力地图。等级表达阶段，经验只通过可追溯事件增减。"
        icon={GitBranch}
        actions={
          <Button onClick={() => setEditing(emptySkill())}>
            <Plus /> 新建技能
          </Button>
        }
      />

      {error ? (
        <div role="alert" className="mb-5 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      <div className="grid gap-5 xl:grid-cols-[1fr_360px]">
        <Card className="bg-card/70">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="size-4 text-primary" /> 能力结构
            </CardTitle>
          </CardHeader>
          <CardContent>
            {tree.length === 0 ? (
              <div className="grid min-h-72 place-items-center rounded-xl border border-dashed text-center">
                <div>
                  <GitBranch className="mx-auto size-9 text-muted-foreground/45" />
                  <p className="mt-4 text-sm font-medium">还没有技能节点</p>
                  <p className="mt-1 text-xs text-muted-foreground">先建立一个根技能，再逐步添加子技能。</p>
                  <Button className="mt-5" size="sm" onClick={() => setEditing(emptySkill())}>
                    <Plus /> 创建第一个技能
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                {tree.map((skill) => (
                  <div
                    key={skill.id}
                    className="group flex items-center gap-3 rounded-lg border bg-background/35 p-3"
                    style={{ marginLeft: `${Math.min(skill.depth, 4) * 22}px` }}
                  >
                    <div className="grid size-9 shrink-0 place-items-center rounded-lg border bg-primary/8 text-primary">
                      {skill.depth ? <ChevronRight className="size-4" /> : <Sparkles className="size-4" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate text-sm font-medium">{skill.name}</p>
                        <Badge variant="outline">Lv. {skill.level}</Badge>
                        <span className="font-mono text-[10px] text-muted-foreground">{skill.experience} XP</span>
                      </div>
                      <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">
                        {skill.description || "暂无说明"}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setError(undefined);
                        setExperienceSkill(skill);
                      }}
                    >
                      <Activity /> 记录经验
                    </Button>
                    <Button size="icon-sm" variant="ghost" aria-label={`编辑 ${skill.name}`} onClick={() => setEditing(skill)}>
                      <Pencil />
                    </Button>
                    <Button size="icon-sm" variant="ghost" aria-label={`删除 ${skill.name}`} onClick={() => setDeleting(skill)}>
                      <Trash2 />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="h-fit bg-card/70">
          <CardHeader>
            <CardTitle className="text-base">最近经验记录</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {skillEvents.length === 0 ? (
              <p className="rounded-lg border border-dashed p-6 text-center text-xs text-muted-foreground">
                记录学习或实践后，变化会出现在这里。
              </p>
            ) : skillEvents.slice(0, 10).map((event) => {
              const skill = skills.find((item) => item.id === event.skillId);
              return (
                <div key={event.id} className="border-l border-primary/30 pl-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="truncate text-xs font-medium">{skill?.name ?? "已删除技能"}</p>
                    <span className={event.delta > 0 ? "font-mono text-xs text-emerald-300" : "font-mono text-xs text-amber-300"}>
                      {event.delta > 0 ? "+" : ""}{event.delta} XP
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">{event.reason}</p>
                  <p className="mt-1 font-mono text-[9px] text-muted-foreground/60">
                    {new Date(event.createdAt).toLocaleString("zh-CN")}
                  </p>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>

      <Dialog open={Boolean(editing)} onOpenChange={(open) => !open && setEditing(undefined)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing && skills.some((skill) => skill.id === editing.id) ? "编辑技能" : "新建技能"}</DialogTitle>
            <DialogDescription>经验值不能在这里直接修改，请使用“记录经验”。</DialogDescription>
          </DialogHeader>
          {editing ? (
            <div className="space-y-4">
              <label className="space-y-2 text-sm">名称
                <Input autoFocus value={editing.name} onChange={(event) => setEditing({ ...editing, name: event.target.value })} />
              </label>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="space-y-2 text-sm">父级技能
                  <Select value={editing.parentId ?? "none"} onValueChange={(value) => setEditing({ ...editing, parentId: value === "none" ? undefined : value })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">无 / 根技能</SelectItem>
                      {skills.filter((skill) => skill.id !== editing.id).map((skill) => (
                        <SelectItem key={skill.id} value={skill.id}>{skill.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </label>
                <label className="space-y-2 text-sm">等级（1–100）
                  <Input type="number" min={1} max={100} value={editing.level} onChange={(event) => setEditing({ ...editing, level: Number(event.target.value) })} />
                </label>
              </div>
              <label className="space-y-2 text-sm">说明
                <Textarea value={editing.description} onChange={(event) => setEditing({ ...editing, description: event.target.value })} />
              </label>
            </div>
          ) : null}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(undefined)}>取消</Button>
            <Button disabled={saving || !editing?.name.trim()} onClick={() => void submitSkill()}>
              {saving ? "保存中…" : "保存技能"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(experienceSkill)} onOpenChange={(open) => !open && setExperienceSkill(undefined)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>记录经验 · {experienceSkill?.name}</DialogTitle>
            <DialogDescription>正数增加经验，负数用于纠正记录；每次变化都会保留事件。</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <label className="space-y-2 text-sm">经验变化
              <Input autoFocus type="number" value={delta} onChange={(event) => setDelta(event.target.value)} />
            </label>
            <label className="space-y-2 text-sm">关联项目
              <Select value={projectId} onValueChange={setProjectId}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">不关联项目</SelectItem>
                  {projects.map((project) => <SelectItem key={project.id} value={project.id}>{project.title}</SelectItem>)}
                </SelectContent>
              </Select>
            </label>
            <label className="space-y-2 text-sm">原因
              <Textarea value={reason} onChange={(event) => setReason(event.target.value)} placeholder="例如：完成一次真实项目实践" />
            </label>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setExperienceSkill(undefined)}>取消</Button>
            <Button disabled={saving || !reason.trim() || !Number(delta)} onClick={() => void submitExperience()}>
              {saving ? "记录中…" : "确认记录"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={Boolean(deleting)} onOpenChange={(open) => !open && setDeleting(undefined)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>删除技能“{deleting?.name}”？</AlertDialogTitle>
            <AlertDialogDescription>经验记录会一并删除，子技能会变成根技能。该操作无法撤销。</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={async () => {
              if (!deleting) return;
              const result = await deleteSkill(deleting.id);
              if (!result.ok) setError(result.error.message);
              setDeleting(undefined);
            }}>确认删除</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
