"use client";

import { useMemo, useState } from "react";
import {
  Activity,
  Bot,
  FileBox,
  FileCode2,
  Filter,
  FolderKanban,
  GitBranch,
  Inbox,
} from "lucide-react";
import { PageHeader } from "@/components/project-os/page-header";
import { useProjectOS } from "@/components/project-os/project-os-provider";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getWeeklyActivityMetrics } from "@/lib/s6";

const entityMeta: Record<string, { label: string; icon: typeof Activity }> = {
  projects: { label: "项目", icon: FolderKanban },
  inbox_items: { label: "Inbox", icon: Inbox },
  agents: { label: "Agent", icon: Bot },
  prompts: { label: "Prompt", icon: FileCode2 },
  knowledge_items: { label: "Knowledge", icon: FileCode2 },
  skills: { label: "技能", icon: GitBranch },
  skill_events: { label: "经验", icon: Activity },
  resources: { label: "资源", icon: FileBox },
};

const actionLabel: Record<string, string> = {
  insert: "已创建",
  update: "已更新",
  delete: "已删除",
  completed: "已完成",
  processed: "已处理",
  archived: "已归档",
};

export function ActivityView() {
  const { activities, projects, inbox } = useProjectOS();
  const [entity, setEntity] = useState("all");
  const metrics = getWeeklyActivityMetrics(activities, { projects, inbox });
  const filtered = useMemo(
    () => activities.filter((item) => entity === "all" || item.entityType === entity),
    [activities, entity],
  );

  return (
    <>
      <PageHeader
        eyebrow="Audit trail / S6"
        title="Activity Log"
        description="查看工作区发生了什么。日志只保存标题级摘要，不记录 Prompt、Knowledge 正文或任何密钥。"
        icon={Activity}
      />

      <div className="mb-5 grid gap-3 sm:grid-cols-3">
        {[
          ["本周活动", metrics.total],
          ["完成项目", metrics.completedProjects],
          ["处理 Inbox", metrics.processedInbox],
        ].map(([label, value]) => (
          <Card key={label} className="bg-card/70"><CardContent className="p-4">
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className="mt-2 font-mono text-2xl">{value}</p>
          </CardContent></Card>
        ))}
      </div>

      <div className="mb-4 flex justify-end">
        <Select value={entity} onValueChange={setEntity}>
          <SelectTrigger className="w-48"><Filter className="size-4" /><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部活动</SelectItem>
            {Object.entries(entityMeta).map(([value, meta]) => <SelectItem key={value} value={value}>{meta.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <Card className="bg-card/70">
        <CardContent className="p-0">
          {filtered.length === 0 ? (
            <div className="grid min-h-72 place-items-center text-center">
              <div><Activity className="mx-auto size-9 text-muted-foreground/40" /><p className="mt-4 text-sm font-medium">暂无活动记录</p><p className="mt-1 text-xs text-muted-foreground">迁移 005 后的新建、修改和处理动作会显示在这里。</p></div>
            </div>
          ) : (
            <div className="divide-y">
              {filtered.map((activity) => {
                const meta = entityMeta[activity.entityType] ?? { label: activity.entityType, icon: Activity };
                return (
                  <div key={activity.id} className="flex gap-4 p-4">
                    <div className="grid size-9 shrink-0 place-items-center rounded-full border bg-background"><meta.icon className="size-4 text-primary" /></div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="outline">{meta.label}</Badge>
                        <span className="text-sm font-medium">{actionLabel[activity.action] ?? activity.action}</span>
                        <span className="truncate text-sm text-muted-foreground">{activity.summary}</span>
                      </div>
                      <p className="mt-1.5 font-mono text-[10px] text-muted-foreground/60">{new Date(activity.createdAt).toLocaleString("zh-CN")}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
}
