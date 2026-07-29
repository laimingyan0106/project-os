import { describe, expect, it } from "vitest";
import { seedState } from "@/lib/seed-data";
import {
  createV1BackupRecord,
  isV1BackupExpired,
  normalizeLegacyV1Snapshot,
  parseLegacyV1Snapshot,
} from "@/lib/migration/v1-snapshot";

const v1Seed = {
  projects: seedState.projects,
  agents: seedState.agents,
  inbox: seedState.inbox,
  workflow: {
    id: seedState.workflow.id,
    title: seedState.workflow.title,
    nodes: seedState.workflow.nodes,
    edges: seedState.workflow.edges,
  },
};

describe("v0.1 snapshot migration", () => {
  it("recognizes the untouched v0.1 example state", () => {
    const result = parseLegacyV1Snapshot(JSON.stringify(v1Seed));
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.isSeedEquivalent).toBe(true);
  });

  it("rejects edges that reference a missing node", () => {
    const result = parseLegacyV1Snapshot({
      ...v1Seed,
      workflow: {
        ...v1Seed.workflow,
        edges: [{ id: "edge", source: "missing", target: "n1" }],
      },
    });
    expect(result).toEqual({
      ok: false,
      message: "工作流连线引用了不存在的节点。",
    });
  });

  it("preserves UUIDs and replaces legacy short ids while keeping references", () => {
    const projectUuid = "cc0ff94e-58b3-4a72-b18a-ccdd0b9467bc";
    const generated = [
      "00000000-0000-4000-8000-000000000001",
      "00000000-0000-4000-8000-000000000002",
      "00000000-0000-4000-8000-000000000003",
      "00000000-0000-4000-8000-000000000004",
      "00000000-0000-4000-8000-000000000005",
      "00000000-0000-4000-8000-000000000006",
      "00000000-0000-4000-8000-000000000007",
      "00000000-0000-4000-8000-000000000008",
      "00000000-0000-4000-8000-000000000009",
      "00000000-0000-4000-8000-000000000010",
      "00000000-0000-4000-8000-000000000011",
      "00000000-0000-4000-8000-000000000012",
      "00000000-0000-4000-8000-000000000013",
      "00000000-0000-4000-8000-000000000014",
      "00000000-0000-4000-8000-000000000015",
      "00000000-0000-4000-8000-000000000016",
    ];
    const source = {
      ...v1Seed,
      projects: [
        {
          ...v1Seed.projects[0],
          id: projectUuid,
          workflowId: "w1",
        },
      ],
    };
    const parsed = parseLegacyV1Snapshot(source);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;

    const normalized = normalizeLegacyV1Snapshot(parsed.snapshot, {
      now: "2026-07-29T00:00:00.000Z",
      createId: () => generated.shift()!,
    });

    expect(normalized.projects[0].id).toBe(projectUuid);
    expect(normalized.projects[0].workflowId).toBe(normalized.workflow.id);
    expect(normalized.workflow.projectId).toBe(projectUuid);
    expect(normalized.workflow.edges[0].source)
      .toBe(normalized.workflow.nodes[0].id);
  });

  it("keeps a migrated backup for exactly 30 days", () => {
    const migratedAt = new Date("2026-07-30T00:00:00.000Z");
    const backup = createV1BackupRecord('{"version":1}', migratedAt);

    expect(backup.expiresAt).toBe("2026-08-29T00:00:00.000Z");
    expect(isV1BackupExpired(
      backup,
      Date.parse("2026-08-28T23:59:59.999Z"),
    )).toBe(false);
    expect(isV1BackupExpired(
      backup,
      Date.parse("2026-08-29T00:00:00.000Z"),
    )).toBe(true);
  });
});
