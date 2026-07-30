import { expect, test } from "@playwright/test";

const protectedRoutes = [
  "/",
  "/projects",
  "/workflows",
  "/workflows/00000000-0000-0000-0000-000000000000",
  "/agents",
  "/inbox",
  "/prompts",
  "/knowledge",
  "/settings",
];

for (const path of protectedRoutes) {
  test(`${path} redirects anonymous users to login`, async ({ page }) => {
    await page.goto(path);
    await expect(page).toHaveURL(/\/login\?next=/);
    await expect(page.getByRole("heading", { level: 2, name: "欢迎回到工作区" })).toBeVisible();
  });
}

test("login supports password and Magic Link modes", async ({ page }) => {
  await page.goto("/login");
  await expect(page.getByLabel("邮箱")).toBeVisible();
  await expect(page.getByLabel("密码")).toBeVisible();
  await page.getByRole("button", { name: "Magic Link" }).click();
  await expect(page.getByText("我们会发送一次性登录链接，无需输入密码。")).toBeVisible();
  await expect(page.getByRole("button", { name: "发送登录链接" })).toBeVisible();
});

test("signup validates credentials before contacting Supabase", async ({ page }) => {
  await page.goto("/signup");
  await page.getByLabel("邮箱").fill("not-an-email");
  await page.getByLabel("密码", { exact: true }).fill("short");
  await page.getByLabel("确认密码").fill("different");
  await page.getByRole("button", { name: "创建账户" }).click();
  await expect(page.getByText("请输入有效的邮箱地址")).toBeVisible();
  await expect(page.getByText("密码至少需要 8 位")).toBeVisible();
  await expect(page.getByText("两次输入的密码不一致")).toBeVisible();
});

test("invalid email callback provides a recovery path", async ({ page }) => {
  await page.goto("/auth/callback");
  await expect(page.getByRole("heading", { name: "正在验证安全链接" })).toBeVisible();
  await expect(
    page.getByRole("alert").filter({ hasText: "登录链接无效、已过期或已经使用" }),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: "重新申请密码重置" })).toBeVisible();
});

test("invalid token-hash recovery link returns to password recovery", async ({ page }) => {
  await page.goto("/auth/confirm?type=recovery&next=/auth/update-password");
  await expect(page).toHaveURL(/\/forgot-password\?error=/);
  await expect(page.getByText("密码重置链接无效、已过期或已经使用，请重新申请。")).toBeVisible();
});

test("mobile auth page has no horizontal page overflow", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "mobile", "Mobile-only layout assertion");
  await page.goto("/login");
  const hasOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
  );
  expect(hasOverflow).toBe(false);
});
