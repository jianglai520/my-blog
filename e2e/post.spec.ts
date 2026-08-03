import { test, expect } from "@playwright/test";

test("文章详情页渲染 Markdown 正文", async ({ page }) => {
  // 从首页动态获取第一篇文章链接，避免依赖固定文章 id（可能被删/slug 变化）
  await page.goto("/");
  const firstLink = page.locator("h3 a").first();
  await expect(firstLink).toBeVisible();
  const href = await firstLink.getAttribute("href");
  expect(href).toMatch(/^\/posts\//);

  await page.goto(href!);
  await expect(page.locator(".markdown-body")).toBeVisible();
  await expect(page.locator("h1").first()).toBeVisible();

  // 评论区存在
  await expect(page.getByText("写评论")).toBeVisible();
  await expect(page.getByLabel("昵称")).toBeVisible();
  await expect(page.getByLabel("内容")).toBeVisible();
});

test("404 页面正常（不存在的文章）", async ({ page }) => {
  const res = await page.goto("/posts/this-post-does-not-exist-12345");
  expect(res?.status()).toBe(404);
});
