import { test, expect } from "@playwright/test";

test("搜索框跳转搜索页并展示结果", async ({ page }) => {
  await page.goto("/");
  const searchInput = page.getByRole("searchbox");
  await expect(searchInput).toBeVisible();

  // 输入关键词（用已有文章标题的一部分，如"测试"）
  await searchInput.fill("测试");
  await page.waitForURL(/\/search\?q=/);

  // 搜索结果区域（有文章或"没有找到"提示都算正常渲染）
  await expect(page.locator("h1")).toContainText("搜索");
});

test("搜索不存在的词显示空结果提示", async ({ page }) => {
  await page.goto("/search?q=%E4%B8%8D%E5%AD%98%E5%9C%A8%E7%9A%84%E8%AF%8D%E6%B1%87xyz");
  await expect(page.getByText(/没有找到相关文章/)).toBeVisible();
});
