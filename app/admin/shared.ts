import type { Post } from "@/lib/posts";

/** 后台共用输入框样式 */
export const inputCls =
  "w-full rounded-lg border border-ink-600 bg-ink-800 px-4 py-3 text-fg placeholder:text-fg-faint focus:outline-none focus:ring-2 focus:ring-brand-500";

/** 后台文章类型（带标签嵌套） */
export type AdminPost = Post & { post_tags?: { tag: { name: string } }[] };
