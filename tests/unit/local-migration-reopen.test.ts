import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const provider = readFileSync(
  resolve(
    process.cwd(),
    "src/components/project-os/project-os-provider.tsx",
  ),
  "utf8",
);

describe("local migration dialog reopen behavior", () => {
  it("keeps the account summary separate from the current dialog result", () => {
    expect(provider).toContain("result?: LocalMigrationSummary");
    expect(provider).toContain("summary={migrationDialog.result}");
    expect(provider).toContain(
      "setMigrationDialog((current) => ({ ...current, result: result.data }))",
    );
  });

  it("clears the previous result whenever the dialog is opened again", () => {
    expect(provider).toMatch(
      /openLocalMigration[\s\S]*?sourceJson: detectedSource,\s*result: undefined,/,
    );
  });
});
