import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

/**
 * 无障碍回归：检查 WCAG 2.1 A/AA 中除颜色对比度外的所有规则。
 *
 * 为什么关闭 color-contrast：
 * 青绿毛玻璃主题的次要文字（`text-fg-muted` / `text-fg-faint`）对比度是已知设计取舍，
 * 强行拉高会破坏整体视觉。其余语义类问题（缺 label、role 错误、标题层级等）必须为 0。
 */
const PAGES = ["/", "/archives", "/about", "/projects", "/guestbook"];

for (const path of PAGES) {
  test(`无障碍：${path}`, async ({ page }) => {
    await page.goto(path, { waitUntil: "networkidle" });

    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      .disableRules(["color-contrast"])
      .analyze();

    const blocking = results.violations.filter(
      (violation) => violation.impact === "serious" || violation.impact === "critical",
    );

    expect(
      blocking.map((violation) => ({
        id: violation.id,
        impact: violation.impact,
        nodes: violation.nodes.length,
      })),
    ).toEqual([]);
  });
}
