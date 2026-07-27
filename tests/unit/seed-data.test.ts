import { describe, expect, it } from "vitest";
import { seedState } from "@/lib/seed-data";

describe("v0.1 seed state regression contract", () => {
  it("uses unique IDs within each entity collection", () => {
    for (const collection of [seedState.projects, seedState.agents, seedState.inbox]) {
      const ids = collection.map((item) => item.id);
      expect(new Set(ids).size).toBe(ids.length);
    }
  });

  it("only connects workflow edges to existing nodes", () => {
    const nodeIds = new Set(seedState.workflow.nodes.map((node) => node.id));

    for (const edge of seedState.workflow.edges) {
      expect(nodeIds.has(edge.source)).toBe(true);
      expect(nodeIds.has(edge.target)).toBe(true);
    }
  });

  it("only points next-agent relationships at existing agents", () => {
    const agentIds = new Set(seedState.agents.map((agent) => agent.id));

    for (const agent of seedState.agents) {
      if (agent.nextAgent) expect(agentIds.has(agent.nextAgent)).toBe(true);
    }
  });
});
