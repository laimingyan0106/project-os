"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowUpRight, Bot, CheckCircle2, FolderKanban, Inbox, Orbit, Workflow } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/project-os/page-header";
import { useProjectOS } from "@/components/project-os/project-os-provider";

const statusLabel = { active: "进行中", planning: "规划中", blocked: "受阻", done: "已完成" };
const statusClass = {
  active: "border-emerald-400/20 bg-emerald-400/10 text-emerald-300",
  planning: "border-sky-400/20 bg-sky-400/10 text-sky-300",
  blocked: "border-red-400/20 bg-red-400/10 text-red-300",
  done: "border-muted bg-muted text-muted-foreground",
};

export function DashboardView() {
  const { projects, agents, inbox } = useProjectOS();
  const unread = inbox.filter((item) => !item.processed).length;
  const stats = [
    { label: "活跃项目", value: projects.filter((p) => p.status === "active").length, note: `${projects.length} 个项目`, icon: FolderKanban },
    { label: "待处理收集", value: unread, note: unread ? "需要你的决策" : "收件箱已清空", icon: Inbox },
    { label: "在线代理", value: agents.filter((a) => a.status !== "draft").length, note: `${agents.filter((a) => a.status === "working").length} 个正在工作`, icon: Bot },
    { label: "本周完成率", value: "74%", note: "较上周 +12%", icon: CheckCircle2 },
  ];

  return (
    <>
      <PageHeader eyebrow="Overview / Today" title="晚上好，创造者。"
        description="你负责判断方向，系统负责让工作持续向前。这里是此刻最值得注意的信号。"
        icon={Orbit}
        actions={<Button asChild><Link href="/projects?new=1">新建项目 <ArrowUpRight /></Link></Button>}
      />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat, index) => (
          <motion.div key={stat.label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.05 }}>
            <Card className="relative overflow-hidden bg-card/70">
              <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent" />
              <CardContent className="p-5">
                <div className="flex items-start justify-between"><p className="text-xs text-muted-foreground">{stat.label}</p><stat.icon className="size-4 text-primary/80" /></div>
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
            <div><p className="font-mono text-[9px] uppercase tracking-[0.2em] text-primary">Priority stack</p><CardTitle className="mt-2">正在推进</CardTitle></div>
            <Button asChild size="sm" variant="ghost"><Link href="/projects">查看全部 <ArrowUpRight /></Link></Button>
          </CardHeader>
          <CardContent className="space-y-2">
            {projects.slice(0, 4).map((project, index) => (
              <Link href="/projects" key={project.id} className="group grid grid-cols-[30px_1fr_auto] items-center gap-3 rounded-md border border-transparent p-3 transition-colors hover:border-border hover:bg-background/40">
                <span className="font-mono text-[10px] text-muted-foreground/50">0{index + 1}</span>
                <div className="min-w-0"><p className="truncate text-sm font-medium group-hover:text-primary">{project.title}</p><p className="mt-1 truncate text-xs text-muted-foreground">{project.goal}</p></div>
                <div className="text-right"><Badge variant="outline" className={statusClass[project.status]}>{statusLabel[project.status]}</Badge><p className="mt-1.5 font-mono text-[9px] text-muted-foreground">{project.updatedAt}</p></div>
              </Link>
            ))}
          </CardContent>
        </Card>

        <Card className="bg-card/70">
          <CardHeader><p className="font-mono text-[9px] uppercase tracking-[0.2em] text-primary">Live pipeline</p><CardTitle className="mt-2">代理接力</CardTitle></CardHeader>
          <CardContent>
            <div className="relative space-y-5 before:absolute before:bottom-4 before:left-[15px] before:top-4 before:w-px before:bg-border">
              {agents.map((agent) => (
                <div key={agent.id} className="relative flex gap-3">
                  <div className="z-10 grid size-8 shrink-0 place-items-center rounded-full border bg-background"><Bot className="size-3.5 text-primary" /></div>
                  <div className="min-w-0 flex-1 pt-0.5"><div className="flex items-center justify-between gap-2"><p className="text-sm font-medium">{agent.name}</p><span className="font-mono text-[9px] uppercase text-muted-foreground">{agent.status}</span></div><p className="mt-1 text-xs text-muted-foreground">{agent.role} · {agent.output}</p></div>
                </div>
              ))}
            </div>
            <Button asChild variant="outline" className="mt-6 w-full"><Link href="/workflows"><Workflow />打开工作流</Link></Button>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
