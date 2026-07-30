import type {
  ActivityLog,
  InboxItem,
  Project,
  Skill,
} from "@/lib/project-os";

const SECRET_PATTERNS = [
  /(?:api[_-]?key|access[_-]?token|secret|password)\s*[:=]\s*\S{8,}/i,
  /\bsk-[a-z0-9_-]{16,}\b/i,
  /\bgh[pousr]_[a-z0-9]{20,}\b/i,
];

export function containsPlaintextSecret(value: string) {
  return SECRET_PATTERNS.some((pattern) => pattern.test(value));
}

export interface SkillTreeNode extends Skill {
  children: SkillTreeNode[];
  depth: number;
}

export function buildSkillTree(skills: Skill[]): SkillTreeNode[] {
  const byId = new Map<string, SkillTreeNode>(
    skills.map((skill) => [skill.id, { ...skill, children: [], depth: 0 }]),
  );
  const roots: SkillTreeNode[] = [];

  for (const node of byId.values()) {
    const parent = node.parentId ? byId.get(node.parentId) : undefined;
    if (!parent || parent.id === node.id) {
      roots.push(node);
      continue;
    }
    node.depth = parent.depth + 1;
    parent.children.push(node);
  }

  const sort = (nodes: SkillTreeNode[], depth = 0) => {
    nodes.sort((a, b) => a.name.localeCompare(b.name, "zh-CN"));
    for (const node of nodes) {
      node.depth = depth;
      sort(node.children, depth + 1);
    }
  };
  sort(roots);
  return roots;
}

export function flattenSkillTree(nodes: SkillTreeNode[]): SkillTreeNode[] {
  return nodes.flatMap((node) => [node, ...flattenSkillTree(node.children)]);
}

export function projectPriorityScore(project: Project) {
  const priority = { high: 3, medium: 2, low: 1 }[project.priority];
  const status = { active: 4, blocked: 3, planning: 2, done: 1 }[project.status];
  return priority * 10 + status;
}

export function sortDashboardProjects(projects: Project[]) {
  return [...projects].sort((a, b) => {
    const score = projectPriorityScore(b) - projectPriorityScore(a);
    if (score !== 0) return score;
    return Date.parse(b.updatedAt) - Date.parse(a.updatedAt);
  });
}

export function getWeeklyActivityMetrics(
  activities: ActivityLog[],
  options: {
    projects: Project[];
    inbox: InboxItem[];
    now?: Date;
  },
) {
  const now = options.now ?? new Date();
  const start = new Date(now);
  const day = (start.getDay() + 6) % 7;
  start.setDate(start.getDate() - day);
  start.setHours(0, 0, 0, 0);

  const current = activities.filter(
    (activity) => Date.parse(activity.createdAt) >= start.getTime(),
  );
  const doneProjectIds = new Set(
    options.projects
      .filter((project) => project.status === "done")
      .map((project) => project.id),
  );
  const processedInboxIds = new Set(
    options.inbox
      .filter((item) => item.processed || item.status === "processed")
      .map((item) => item.id),
  );
  const completedProjects = new Set(
    current
      .filter(
        (activity) =>
          activity.entityType === "projects"
          && activity.action === "completed"
          && activity.entityId
          && doneProjectIds.has(activity.entityId),
      )
      .map((activity) => activity.entityId),
  ).size;
  const processedInbox = new Set(
    current
      .filter(
        (activity) =>
          activity.entityType === "inbox_items"
          && activity.action === "processed"
          && activity.entityId
          && processedInboxIds.has(activity.entityId),
      )
      .map((activity) => activity.entityId),
  ).size;

  return {
    total: current.length,
    completedProjects,
    processedInbox,
    completedWork: completedProjects + processedInbox,
  };
}
