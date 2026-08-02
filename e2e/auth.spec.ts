import { test, expect } from "@playwright/test";

/**
 * 登录流程（可选）：需要环境变量 TEST_EMAIL / TEST_PASSWORD（GitHub Secrets 或本地 env），
 * 未配置则跳过——避免把真实密码写进仓库。
 */
const email = process.env.TEST_EMAIL;
const password = process.env.TEST_PASSWORD;

test.skip(!email || !password, "未配置 TEST_EMAIL/TEST_PASSWORD，跳过登录测试");

test("登录成功后进入后台", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("邮箱").fill(email!);
  await page.getByLabel("密码").fill(password!);
  await page.getByRole("button", { name: "登录" }).click();

  // 登录成功后跳转 /admin
  await page.waitForURL(/\/admin/);
  await expect(page.getByText("后台管理")).toBeVisible();

  // 退出登录
  await page.getByRole("button", { name: "退出登录" }).click();
  await page.waitForURL(/\/login/);
});

test("未登录访问 /admin 被重定向到登录页", async ({ page }) => {
  await page.goto("/admin");
  await page.waitForURL(/\/login/);
});
