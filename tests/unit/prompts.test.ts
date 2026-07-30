import { describe, expect, it } from "vitest";
import { detectPromptVariables, parsePromptTags } from "@/lib/prompts";

describe("Prompt asset helpers", () => {
  it("detects unique variables in first-seen order", () => {
    expect(detectPromptVariables(
      "为 {{project.name}} 写 {{ format }}，再检查 {{project.name}}。",
    )).toEqual(["project.name", "format"]);
  });

  it("normalizes Chinese and English tag separators", () => {
    expect(parsePromptTags("开发, 规划，开发, 交付")).toEqual([
      "开发",
      "规划",
      "交付",
    ]);
  });
});
