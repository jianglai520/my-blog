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
