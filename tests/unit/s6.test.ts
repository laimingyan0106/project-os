import { describe, expect, it } from "vitest";
import type { ActivityLog, Project, Skill } from "@/lib/project-os";
import {
  buildSkillTree,
  containsPlaintextSecret,
  flattenSkillTree,
  getWeeklyActivityMetrics,
  sortDashboardProjects,
} from "@/lib/s6";

const timestamp = "2026-07-30T08:00:00.000Z";

describe("S6 helpers", () => {
  it("builds and flattens a stable parent-child skill tree", () => {
    const skills: Skill[] = [
      { id: "child", name: "React", parentId: "root", level: 8, experience: 20, description: "", createdAt: timestamp, updatedAt: timestamp },
      { id: "root", name: "Frontend", level: 10, experience: 50, description: "", createdAt: timestamp, updatedAt: timestamp },
    ];
    const flattened = flattenSkillTree(buildSkillTree(skills));
    expect(flattened.map((skill) => [skill.id, skill.depth])).toEqual([
      ["root", 0],
      ["child", 1],
    ]);
  });

  it("detects common plaintext secret formats without rejecting secret references", () => {
    expect(containsPlaintextSecret("api_key=sk-example0123456789012345")).toBe(true);
    expect(containsPlaintextSecret("Vercel: OPENAI_API_KEY")).toBe(false);
  });

  it("sorts dashboard projects by priority, status, then update time", () => {
    const base: Project = {
      id: "1",
      title: "A",
      goal: "",
      status: "planning",
      priority: "low",
      updatedAt: timestamp,
    };
    expect(sortDashboardProjects([
      base,
      { ...base, id: "2", title: "High", priority: "high" },
      { ...base, id: "3", title: "Active", status: "active" },
    ]).map((project) => project.id)).toEqual(["2", "3", "1"]);
  });

  it("calculates weekly completions from activity logs", () => {
    const activities: ActivityLog[] = [
      { id: "1", entityType: "projects", action: "completed", summary: "A", metadata: {}, createdAt: "2026-07-29T10:00:00.000Z" },
      { id: "2", entityType: "inbox_items", action: "processed", summary: "B", metadata: {}, createdAt: "2026-07-30T10:00:00.000Z" },
      { id: "3", entityType: "projects", action: "completed", summary: "Old", metadata: {}, createdAt: "2026-07-20T10:00:00.000Z" },
    ];
    const projects: Project[] = [{
      id: "project-1",
      title: "A",
      goal: "",
      status: "done",
      priority: "medium",
      updatedAt: timestamp,
    }];
    const inbox = [{
      id: "inbox-1",
      title: "B",
      content: "",
      kind: "task" as const,
      processed: true,
      status: "processed" as const,
      createdAt: timestamp,
    }];
    activities[0].entityId = "project-1";
    activities[1].entityId = "inbox-1";
    expect(getWeeklyActivityMetrics(activities, {
      projects,
      inbox,
      now: new Date("2026-07-30T12:00:00.000Z"),
    })).toMatchObject({
      total: 2,
      completedProjects: 1,
      processedInbox: 1,
      completedWork: 2,
    });
  });

  it("does not count a project that was completed this week but is active again", () => {
    const activities: ActivityLog[] = [{
      id: "event-1",
      entityType: "projects",
      entityId: "project-1",
      action: "completed",
      summary: "A",
      metadata: {},
      createdAt: "2026-07-29T10:00:00.000Z",
    }];
    const projects: Project[] = [{
      id: "project-1",
      title: "A",
      goal: "",
      status: "active",
      priority: "medium",
      updatedAt: timestamp,
    }];

    expect(getWeeklyActivityMetrics(activities, {
      projects,
      inbox: [],
      now: new Date("2026-07-30T12:00:00.000Z"),
    }).completedProjects).toBe(0);
  });
});
