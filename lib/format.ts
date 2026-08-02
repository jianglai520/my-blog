/** 格式化为中文日期：2026年8月2日 */
export function formatDate(input: string): string {
  return new Date(input).toLocaleDateString("zh-CN", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

/** 格式化为中文日期 + 时间：2026年8月2日 14:30 */
export function formatDateTime(input: string): string {
  return new Date(input).toLocaleDateString("zh-CN", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** 从标题生成 slug（用于后台表单的建议值） */
export function slugify(title: string): string {
  return title
    .trim()
    .toLowerCase()
    .replace(/[\s_]+/g, "-")
    .replace(/[^\w\u4e00-\u9fa5-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

/**
 * 从 Markdown 源文本提取纯文本（去标题符号/强调/代码围栏/链接/图片语法），
 * 用于列表卡片摘要等场景，避免摘要里出现 `#`、`**`、`![]()` 等符号。
 */
export function stripMarkdown(md: string): string {
  return md
    .replace(/```[\s\S]*?```/g, " ") // 代码围栏整块替换为空格
    .replace(/`([^`]*)`/g, "$1") // 行内代码
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, "$1") // 图片 ![alt](url) → alt
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1") // 链接 [text](url) → text
    .replace(/^#{1,6}\s+/gm, "") // 标题符号
    .replace(/^\s*[-*+]\s+/gm, "") // 无序列表符号
    .replace(/^\s*\d+\.\s+/gm, "") // 有序列表符号
    .replace(/^>\s?/gm, "") // 引用符号
    .replace(/^\s*[-_*]{3,}\s*$/gm, "") // 分隔线
    .replace(/(\*\*|__)(.*?)\1/g, "$2") // 粗体
    .replace(/(\*|_)(.*?)\1/g, "$2") // 斜体
    .replace(/~~(.*?)~~/g, "$1") // 删除线
    .replace(/^\s*\|.*\|\s*$/gm, "") // 表格行
    .replace(/\s+/g, " ")
    .trim();
}
