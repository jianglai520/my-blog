import { test, expect } from "@playwright/test";

/**
 * 后台发布链路（可选）：需要 TEST_EMAIL / TEST_PASSWORD。
 * 只创建「草稿」并删除，不会出现在公开页面，也不会污染正式内容。
 */
const email = process.env.TEST_EMAIL;
const password = process.env.TEST_PASSWORD;

test.skip(!email || !password, "未配置 TEST_EMAIL/TEST_PASSWORD，跳过后台测试");

test("后台创建草稿并删除", async ({ page }) => {
  const title = `E2E 测试草稿 ${Date.now()}`;

  await page.goto("/login");
  await page.getByLabel("邮箱").fill(email!);
  await page.getByLabel("密码").fill(password!);
  await page.getByRole("button", { name: "登录" }).click();
  await page.waitForURL(/\/admin/, { timeout: 30_000 });

  // 编辑器是懒加载的
  await page.waitForSelector("#post-title", { timeout: 30_000 });
  await page.fill("#post-title", title);
  await page.locator("textarea").first().fill("这是一条自动化测试创建的草稿正文。");

  await page.getByRole("button", { name: /保存草稿/ }).click();

  // 保存成功后表单退出、列表刷新，出现该草稿标题
  const row = page
    .locator("div.flex.items-center.justify-between")
    .filter({ hasText: title })
    .first();
  await expect(row).toBeVisible({ timeout: 30_000 });

  // 删除（原生 confirm）
  page.once("dialog", (dialog) => dialog.accept());
  await row.getByRole("button", { name: "删除" }).click();

  await expect(page.getByRole("link", { name: title })).toHaveCount(0, {
    timeout: 30_000,
  });
});
