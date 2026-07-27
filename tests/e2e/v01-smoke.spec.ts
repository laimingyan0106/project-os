import { expect, test } from "@playwright/test";

const routes = [
  ["/", "晚上好，创造者。"],
  ["/projects", "项目不是清单，是目标的容器。"],
  ["/workflows", "把目标变成可见的执行路径。"],
  ["/agents", "组建你的 AI 执行团队。"],
  ["/inbox", "先收集，再决定。"],
  ["/settings", "系统边界与连接。"],
] as const;

for (const [path, heading] of routes) {
  test(`${path} renders its v0.1 landmark`, async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on("console", (message) => {
      if (message.type() === "error") consoleErrors.push(message.text());
    });

    await page.goto(path);
    await expect(page.getByRole("heading", { level: 1, name: heading })).toBeVisible();
    await page.waitForTimeout(100);
    expect(consoleErrors).toEqual([]);
  });
}

test("mobile workspace has no horizontal page overflow", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "mobile", "Mobile-only layout assertion");
  await page.goto("/inbox");
  const hasOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
  );
  expect(hasOverflow).toBe(false);
});
