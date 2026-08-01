import { supabase } from "./supabase";

// 文章/评论在代码中的统一类型（保持与现有页面数据结构一致，仅扩展新字段）
export type Post = {
  id: number;
  slug: string | null;
  title: string;
  content: string;
  excerpt: string | null;
  cover_image: string | null;
  created_at: string;
  published: boolean;
};

export type Comment = {
  id: number;
  post_id: number;
  name: string;
  content: string;
  created_at: string;
};

const POST_SELECT = "id,slug,title,content,excerpt,cover_image,created_at,published";
// 兼容降级：新字段（slug/excerpt/cover_image）尚未加到数据库时的旧列集合
const POST_SELECT_LEGACY = "id,title,content,created_at,published";

/** 判断错误是否为"列不存在"（Postgres 42703 undefined_column） */
function isUndefinedColumn(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const code = (error as { code?: string }).code;
  return code === "42703";
}

/**
 * 已发布文章列表（首页 / sitemap 用），按时间倒序。
 * 若新扩展列尚未在数据库存在（用户未跑 ALTER TABLE），自动降级为旧列，避免整个站点报错。
 */
export async function getPublishedPosts(): Promise<Post[]> {
  const { data, error } = await supabase
    .from("posts")
    .select(POST_SELECT)
    .eq("published", true)
    .order("created_at", { ascending: false });

  if (error && isUndefinedColumn(error)) {
    const fallback = await supabase
      .from("posts")
      .select(POST_SELECT_LEGACY)
      .eq("published", true)
      .order("created_at", { ascending: false });
    // 旧列不含新扩展字段，填充 null 以保持 Post 结构
    const legacy = (fallback.data || []).map((row: Record<string, unknown>) => ({
      ...row,
      slug: null,
      excerpt: null,
      cover_image: null,
    })) as Post[];
    return legacy;
  }

  if (error) {
    console.error("读取文章失败:", error);
    return [];
  }
  return (data as Post[]) || [];
}

/** 按某唯一字段查单条文章（带列降级），返回 data/error */
async function queryPostBy<K extends "id" | "slug">(
  field: K,
  value: K extends "id" ? number : string,
): Promise<{ data: Post | null; error: unknown }> {
  const run = async (select: string) => {
    const builder = supabase.from("posts").select(select).eq(field as never, value as never);
    return (await builder.maybeSingle()) as { data: Post | null; error: unknown };
  };

  let result = await run(POST_SELECT);
  if (result.error && isUndefinedColumn(result.error)) {
    result = await run(POST_SELECT_LEGACY);
  }
  return result;
}

/**
 * 按 slug 查单篇文章；若未查中，降级用 id 查（覆盖加 slug 字段前的旧数据）。
 */
export async function getPostByIdentifier(identifier: string): Promise<Post | null> {
  const numId = /^\d+$/.test(identifier) ? Number(identifier) : null;

  // 先按 slug（注意约束唯一，但旧数据可能重复/缺失）
  const bySlug = await queryPostBy("slug", identifier);
  if (bySlug.data) return bySlug.data;

  // 若 identifier 是纯数字，尝试按 id 兜底
  if (numId !== null) {
    const byId = await queryPostBy("id", numId);
    if (byId.data) return byId.data;
  }

  return null;
}

/**
 * 某篇文章的所有评论，按时间正序。
 */
export async function getComments(postId: number): Promise<Comment[]> {
  const { data } = await supabase
    .from("comments")
    .select("id,post_id,name,content,created_at")
    .eq("post_id", postId)
    .order("created_at", { ascending: true });

  return (data as Comment[]) || [];
}
