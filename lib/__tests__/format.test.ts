import { describe, it, expect } from "vitest";
import {
  formatDate,
  formatDateTime,
  slugify,
  stripMarkdown,
  countWords,
  readingMinutes,
} from "@/lib/format";

describe("formatDate / formatDateTime", () => {
  it("格式化中文日期", () => {
    expect(formatDate("2026-08-02T10:00:00Z")).toMatch(/2026年8月2日/);
  });

  it("格式化中文日期时间", () => {
    expect(formatDateTime("2026-08-02T10:30:00Z")).toMatch(/2026年8月2日/);
  });
});

describe("slugify", () => {
  it("小写化并替换空格", () => {
    expect(slugify("My First Post")).toBe("my-first-post");
  });

  it("去除非字母数字和连字符（保留连字符分隔）", () => {
    expect(slugify("Hello, World! 你好")).toBe("hello-world-你好");
  });

  it("处理中文标题（保留中文）", () => {
    expect(slugify("学习笔记")).toBe("学习笔记");
  });

  it("折叠多余连字符并去首尾", () => {
    expect(slugify("--a--b--")).toBe("a-b");
  });
});

describe("stripMarkdown", () => {
  it("去除标题符号", () => {
    expect(stripMarkdown("# 标题")).toBe("标题");
  });

  it("去除粗体/斜体标记", () => {
    expect(stripMarkdown("这是**加粗**和*斜体*")).toBe("这是加粗和斜体");
  });

  it("去除链接保留文本", () => {
    expect(stripMarkdown("[文本](https://example.com)")).toBe("文本");
  });

  it("去除图片保留 alt", () => {
    expect(stripMarkdown("![图片](https://x.com/a.png)")).toBe("图片");
  });

  it("移除代码块", () => {
    expect(stripMarkdown("前```js\ncode\n```后")).toMatch(/前\s+后/);
  });

  it("压缩空白", () => {
    expect(stripMarkdown("a\n\n  b  c")).toBe("a b c");
  });
});

describe("countWords 字数统计", () => {
  it("纯中文按字计", () => {
    expect(countWords("你好世界")).toBe(4);
  });

  it("英文按词计", () => {
    expect(countWords("hello world next js")).toBe(4);
  });

  it("中英混合相加", () => {
    expect(countWords("你好 world next 世界")).toBe(6); // 中文4字 + 英文2词
  });

  it("忽略 Markdown 语法符号", () => {
    expect(countWords("# 标题\n\n**加粗**文字")).toBe(6); // 标题(2) + 加粗文字(4)
  });
});

describe("readingMinutes 阅读时长", () => {
  it("空内容返回 1 分钟（兜底）", () => {
    expect(readingMinutes("")).toBe(1);
  });

  it("约 300 字 = 1 分钟", () => {
    expect(readingMinutes("字".repeat(300))).toBe(1);
  });

  it("约 600 字 = 2 分钟", () => {
    expect(readingMinutes("字".repeat(600))).toBe(2);
  });
});
