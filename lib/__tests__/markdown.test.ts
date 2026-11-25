import { describe, it, expect } from "vitest";
import { normalizeDisplayMath, renderMarkdownHtml } from "@/lib/markdown";

describe("normalizeDisplayMath", () => {
  it("把独占一行的单行 $$...$$ 转成块级", () => {
    expect(normalizeDisplayMath("$$a+b$$")).toBe("$$\na+b\n$$");
  });

  it("兼容 CRLF 行尾", () => {
    expect(normalizeDisplayMath("$$a+b$$\r\n后文")).toBe("$$\na+b\n$$\n后文");
  });

  it("不修改代码块里的 $$", () => {
    const source = "```\n$$a+b$$\n```";
    expect(normalizeDisplayMath(source)).toBe(source);
  });

  it("行内 $...$ 保持不变", () => {
    expect(normalizeDisplayMath("这是 $x$ 行内公式")).toBe("这是 $x$ 行内公式");
  });
});

describe("renderMarkdownHtml 数学公式", () => {
  it("块级公式渲染为 katex-display", async () => {
    const html = await renderMarkdownHtml("$$E = mc^2$$");
    expect(html).toContain("katex-display");
  });

  it("行内公式渲染为 katex（非块级）", async () => {
    const html = await renderMarkdownHtml("质能方程 $E = mc^2$ 很有名");
    expect(html).toContain('class="katex"');
    expect(html).not.toContain("katex-display");
  });

  it("代码块里的 $$ 不渲染公式", async () => {
    const html = await renderMarkdownHtml("```\n$$E = mc^2$$\n```");
    expect(html).not.toContain("katex");
  });
});
