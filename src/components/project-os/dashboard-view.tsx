"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  Activity,
  ArrowUpRight,
  Bot,
  CheckCircle2,
  FolderKanban,
  Inbox,
  Orbit,
  Workflow,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/project-os/page-header";
import { useProjectOS } from "@/components/project-os/project-os-provider";
import { getWeeklyActivityMetrics, sortDashboardProjects } from "@/lib/s6";

const statusLabel = {
  active: "进行中",
  planning: "规划中",
  blocked: "受阻",
  done: "已完成",
};
const statusClass = {
  active: "border-emerald-400/20 bg-emerald-400/10 text-emerald-300",
  planning: "border-sky-400/20 bg-sky-400/10 text-sky-300",
  blocked: "border-red-400/20 bg-red-400/10 text-red-300",
  done: "border-muted bg-muted text-muted-foreground",
};

export function DashboardView() {
  const { projects, agents, inbox, activities } = useProjectOS();
  const unread = inbox.filter((item) => !item.processed).length;
  const weekly = getWeeklyActivityMetrics(activities);
  const priorityProjects = sortDashboardProjects(projects).slice(0, 4);
  const visibleAgents = agents.slice(0, 6);
  const stats = [
    {
      label: "活跃项目",
      value: projects.filter((project) => project.status === "active").length,
      note: `${projects.length} 个云端项目`,
      icon: FolderKanban,
    },
    {
      label: "待处理收集",
      value: unread,
      note: unread ? "需要你的判断" : "收件箱已清空",
      icon: Inbox,
    },
    {
      label: "已配置 Agent",
      value: agents.filter((agent) => agent.status !== "draft").length,
      note: `${agents.filter((agent) => agent.status === "working").length} 个标记为工作中`,
      icon: Bot,
    },
    {
      label: "本周完成",
      value: weekly.completedWork,
      note: weekly.total
        ? `${weekly.completedProjects} 项目 · ${weekly.processedInbox} Inbox`
        : "暂无趋势",
      icon: CheckCircle2,
    },
  ];

  return (
    <>
      <PageHeader
        eyebrow="Overview / Today"
        title="晚上好，创造者。"
        description="这里展示来自云端真实数据的当前重点、能力配置与本周进展。"
        icon={Orbit}
        actions={
          <Button asChild>
            <Link href="/projects?new=1">新建项目 <ArrowUpRight /></Link>
          </Button>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat, index) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
          >
            <Card className="relative overflow-hidden bg-card/70">
              <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent" />
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <p className="text-xs text-muted-foreground">{stat.label}</p>
                  <stat.icon className="size-4 text-primary/80" />
                </div>
                <p className="mt-4 font-mono text-3xl font-medium tracking-[-0.05em]">{stat.value}</p>
                <p className="mt-2 text-[11px] text-muted-foreground">{stat.note}</p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <div className="mt-6 grid gap-5 xl:grid-cols-[1.35fr_0.65fr]">
        <Card className="bg-card/70">
          <CardHeader className="flex-row items-center justify-between">
            <div>
              <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-primary">Priority stack</p>
              <CardTitle className="mt-2">正在推进</CardTitle>
            </div>
            <Button asChild size="sm" variant="ghost">
              <Link href="/projects">查看全部 <ArrowUpRight /></Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-2">
            {priorityProjects.length === 0 ? (
              <div className="rounded-lg border border-dashed p-8 text-center">
                <FolderKanban className="mx-auto size-7 text-muted-foreground/40" />
                <p className="mt-3 text-sm font-medium">还没有项目</p>
                <Button asChild className="mt-4" size="sm"><Link href="/projects?new=1">创建项目</Link></Button>
              </div>
            ) : priorityProjects.map((project, index) => (
              <Link
                href={`/projects/${project.id}`}
                key={project.id}
                className="group grid grid-cols-[30px_1fr_auto] items-center gap-3 rounded-md border border-transparent p-3 transition-colors hover:border-border hover:bg-background/40"
              >
                <span className="font-mono text-[10px] text-muted-foreground/50">0{index + 1}</span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium group-hover:text-primary">{project.title}</p>
                  <p className="mt-1 truncate text-xs text-muted-foreground">{project.goal || "暂无目标"}</p>
                </div>
                <div className="text-right">
                  <Badge variant="outline" className={statusClass[project.status]}>{statusLabel[project.status]}</Badge>
                  <p className="mt-1.5 font-mono text-[9px] text-muted-foreground">
                    {new Date(project.updatedAt).toLocaleDateString("zh-CN")}
                  </p>
                </div>
              </Link>
            ))}
          </CardContent>
        </Card>

        <Card className="bg-card/70">
          <CardHeader>
            <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-primary">Configured pipeline</p>
            <CardTitle className="mt-2">Agent 接力</CardTitle>
          </CardHeader>
          <CardContent>
            {visibleAgents.length === 0 ? (
              <div className="rounded-lg border border-dashed p-8 text-center text-xs text-muted-foreground">还没有配置 Agent。</div>
            ) : (
              <div className="relative space-y-5 before:absolute before:bottom-4 before:left-[15px] before:top-4 before:w-px before:bg-border">
                {visibleAgents.map((agent) => (
                  <div key={agent.id} className="relative flex gap-3">
                    <div className="z-10 grid size-8 shrink-0 place-items-center rounded-full border bg-background">
                      <Bot className="size-3.5 text-primary" />
                    </div>
                    <div className="min-w-0 flex-1 pt-0.5">
                      <div className="flex items-center justify-between gap-2">
                        <p className="truncate text-sm font-medium">{agent.name}</p>
                        <span className="font-mono text-[9px] uppercase text-muted-foreground">{agent.status}</span>
                      </div>
                      <p className="mt-1 truncate text-xs text-muted-foreground">{agent.role}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <Button asChild variant="outline" className="mt-6 w-full">
              <Link href="/agents"><Workflow />管理 Agent 配置</Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card className="mt-5 bg-card/70">
        <CardHeader className="flex-row items-center justify-between">
          <div>
            <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-primary">Workspace pulse</p>
            <CardTitle className="mt-2">最近活动</CardTitle>
          </div>
          <Button asChild size="sm" variant="ghost"><Link href="/activity">完整日志 <ArrowUpRight /></Link></Button>
        </CardHeader>
        <CardContent>
          {activities.length === 0 ? (
            <div className="flex items-center gap-3 rounded-lg border border-dashed p-5 text-sm text-muted-foreground">
              <Activity className="size-4" />暂无活动；执行迁移 005 后的新操作会显示在这里。
            </div>
          ) : (
            <div className="grid gap-2 md:grid-cols-2">
              {activities.slice(0, 6).map((activity) => (
                <div key={activity.id} className="flex items-center gap-3 rounded-lg border bg-background/30 px-3 py-2.5">
                  <Activity className="size-3.5 shrink-0 text-primary" />
                  <p className="min-w-0 flex-1 truncate text-xs">
                    <span className="font-medium">{activity.summary}</span>
                    <span className="ml-2 text-muted-foreground">{activity.action}</span>
                  </p>
                  <time className="font-mono text-[9px] text-muted-foreground">
                    {new Date(activity.createdAt).toLocaleDateString("zh-CN")}
                  </time>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
}
