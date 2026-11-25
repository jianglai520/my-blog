import { test, expect } from "@playwright/test";

test("首页加载并展示文章列表", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveTitle(/jianglai520/);

  // 英雄区存在（不依赖具体博主名——站点配置可后台修改）
  await expect(page.locator("h1").first()).toBeVisible();
  await expect(page.locator(".hero-title")).toBeVisible();

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

test("文章封面图全部加载成功", async ({ page }) => {
  await page.goto("/");

  const images = page.locator("article img");
  const count = await images.count();
  test.skip(count === 0, "当前首页没有封面图");

  // 触发懒加载
  await page.evaluate(async () => {
    for (let y = 0; y < document.body.scrollHeight; y += 500) {
      window.scrollTo(0, y);
      await new Promise((resolve) => setTimeout(resolve, 120));
    }
  });

  await expect
    .poll(
      async () =>
        await images.evaluateAll((nodes) =>
          nodes.every((node) => (node as HTMLImageElement).naturalWidth > 0),
        ),
      { timeout: 15000, message: "存在未加载成功的封面图" },
    )
    .toBe(true);
});

test("分页支持输入页码跳转", async ({ page }) => {
  await page.goto("/");

  const nav = page.locator('nav[aria-label="分页"]');
  test.skip((await nav.count()) === 0, "当前只有一页");

  const jump = page.getByLabel("跳转到页码");
  await expect(jump).toBeVisible();
  await jump.fill("2");
  await page.getByRole("button", { name: "跳转" }).click();
  await expect(page).toHaveURL(/\/page\/2$/);
});
