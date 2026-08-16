/** 格式化为中文日期：2026年8月2日（固定 Asia/Shanghai，避免 SSR 服务器时区（UTC）与客户端不一致） */
export function formatDate(input: string): string {
  return new Date(input).toLocaleDateString("zh-CN", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "Asia/Shanghai",
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
    timeZone: "Asia/Shanghai",
  });
}

/**
 * 文章详情页链接（纯函数，可单测）。
 * 纯数字 slug 一律回退用 id：数字 slug 会与 /posts/<id> 链接冲突，
 * 既会让 /posts/<数字> 被解析为 id 查询，也可能造成重定向循环。
 */
export function postHref(post: { slug: string | null; id: number }): string {
  return post.slug && !/^\d+$/.test(post.slug) ? `/posts/${post.slug}` : `/posts/${post.id}`;
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

/**
 * 统计 Markdown 文章的中文/英文混合字数（纯函数，可单测）。
 * 中文按「字符」计（汉字/标点），连续英文/数字按「词」计。
 * 典型博客中文阅读速度 ~400 字/分钟，英文 ~200 词/分钟，混合按 300 字/分钟折算。
 */
export function countWords(md: string): number {
  const text = stripMarkdown(md);
  const cjk = text.match(/[\u4e00-\u9fa5\u3000-\u303f\uff00-\uffef]/g)?.length ?? 0;
  const latin = text.match(/[a-zA-Z0-9]+(?:['’-][a-zA-Z0-9]+)*/g)?.length ?? 0;
  return cjk + latin;
}

/** 阅读时长（分钟）：混合内容按 300 字/分钟折算，不足 1 分钟按 1 分钟计 */
export function readingMinutes(md: string): number {
  const words = countWords(md);
  if (words <= 0) return 1;
  return Math.max(1, Math.round(words / 300));
}
