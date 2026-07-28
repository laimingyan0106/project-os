import type { ProjectOSState } from "@/lib/project-os";

export const seedState: ProjectOSState = {
  projects: [
    { id: "p1", title: "Project OS MVP", goal: "把创作、项目与 AI 执行统一到一个工作台", status: "active", priority: "high", workflowId: "w1", updatedAt: "今天 18:40" },
    { id: "p2", title: "AI 人格实验室", goal: "建立可持续的内容选题与生产系统", status: "planning", priority: "medium", updatedAt: "昨天 22:10" },
    { id: "p3", title: "小水内容引擎", goal: "把素材整理为可审核的短视频故事包", status: "blocked", priority: "high", updatedAt: "7 月 25 日" },
  ],
  agents: [
    { id: "a1", name: "Scope", role: "项目拆解", input: "目标与约束", output: "里程碑与任务", nextAgent: "a2", status: "working" },
    { id: "a2", name: "Forge", role: "执行代理", input: "已确认任务", output: "可验证交付物", nextAgent: "a3", status: "ready" },
    { id: "a3", name: "Proof", role: "质量审查", input: "交付物与验收标准", output: "问题清单与结论", status: "ready" },
  ],
  inbox: [
    { id: "i1", title: "给 Workflow 增加人工确认节点", content: "外部发布和删除动作都必须经过人类确认。", kind: "idea", processed: false, createdAt: "20 分钟前" },
    { id: "i2", title: "整理 Supabase 数据表", content: "先覆盖 Project、Agent、Workflow 与 Inbox。", kind: "task", processed: false, createdAt: "2 小时前" },
    { id: "i3", title: "深色界面参考", content: "Linear 的密度，Raycast 的层次，Figma 的编辑反馈。", kind: "note", processed: true, createdAt: "昨天" },
  ],
  workflow: {
    id: "w1",
    title: "MVP Delivery Flow",
    description: "",
    version: 1,
    isDefault: true,
    createdAt: "",
    updatedAt: "",
    nodes: [
      { id: "n1", position: { x: 40, y: 145 }, data: { label: "读取目标", kind: "trigger", owner: "You" } },
      { id: "n2", position: { x: 300, y: 55 }, data: { label: "拆解范围", kind: "agent", owner: "Scope" } },
      { id: "n3", position: { x: 300, y: 235 }, data: { label: "实现模块", kind: "agent", owner: "Forge" } },
      { id: "n4", position: { x: 575, y: 145 }, data: { label: "人工确认", kind: "review", owner: "You" } },
      { id: "n5", position: { x: 835, y: 145 }, data: { label: "版本交付", kind: "output", owner: "Proof" } },
    ],
    edges: [
      { id: "e1", source: "n1", target: "n2", animated: true },
      { id: "e2", source: "n1", target: "n3" },
      { id: "e3", source: "n2", target: "n4" },
      { id: "e4", source: "n3", target: "n4" },
      { id: "e5", source: "n4", target: "n5", animated: true },
    ],
  },
};
