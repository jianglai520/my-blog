import { test, expect } from "@playwright/test";

test("首页加载并展示文章列表", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveTitle(/jianglai520/);

  // 英雄区存在
  await expect(page.getByText(/你好，我是航酱/)).toBeVisible();

  // 文章列表标题（存在至少一个 h3 文章标题）
  const h3Count = await page.locator("h3").count();
  expect(h3Count).toBeGreaterThan(0);
});

test("文章卡片可进入详情页", async ({ page }) => {
  await page.goto("/");
  const firstCard = page.locator("h3 a").first();
  await expect(firstCard).toBeVisible();

  const href = await firstCard.getAttribute("href");
  expect(href).toMatch(/^\/posts\//);

  await firstCard.click();
  await expect(page).toHaveURL(new RegExp(`^.*${href}$`));
  // 详情页有正文容器
  await expect(page.locator(".markdown-body")).toBeVisible();
});
