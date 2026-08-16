import { and, asc, desc, eq, ilike, inArray, or, sql } from "drizzle-orm";
import { unstable_cache } from "next/cache";
import { db } from "@/lib/db";
import { posts, comments, tags as tagsTable, postTags, type Post, type Comment } from "@/db/schema";

/**
 * 公开读数据层（Drizzle 直连，应用层安全过滤）。
 *
 * ⚠️ 安全约定：本模块直连数据库（绕过 RLS），所有公开查询
 * 必须显式过滤 `status = 'published'`（草稿永不公开）。
 * 写操作一律走 Server Actions + supabase-js（RLS 防线）。
 */

/** 文章 + 标签（页面展示用） */
export type PostWithTags = Post & { tags: { name: string; slug: string }[] };

const PAGE_SIZE = 10;

/** 把 drizzle 嵌套返回的 postTags 映射为 tags 数组（纯函数，可单测） */
export function mapPostTags(
  post: Post & { postTags?: { tag: { name: string; slug: string } }[] },
): PostWithTags {
  return {
    ...post,
    tags: (post.postTags ?? []).map((pt) => ({ name: pt.tag.name, slug: pt.tag.slug })),
  };
}

/**
 * 已发布文章分页列表（首页 / 标签页用），按时间倒序。
 * 返回 { posts, total }；page 从 1 开始。
 *
 * 缓存：unstable_cache（60s）+ tag "posts"（发布/编辑/删除时 revalidateTag 立即失效）。
 */
export const getPublishedPosts = unstable_cache(
  async (
    page = 1,
    pageSize = PAGE_SIZE,
  ): Promise<{ posts: PostWithTags[]; total: number }> => {
    const offset = (page - 1) * pageSize;

    const [rows, countRows] = await Promise.all([
      db.query.posts.findMany({
        where: eq(posts.status, "published"),
        with: { postTags: { with: { tag: true } } },
        orderBy: [desc(posts.created_at)],
        limit: pageSize,
        offset,
      }),
      db
        .select({ count: sql<number>`count(*)` })
        .from(posts)
        .where(eq(posts.status, "published")),
    ]);

    const total = Number(countRows[0]?.count ?? 0);
    return { posts: rows.map(mapPostTags), total };
  },
  ["published-posts"],
  { revalidate: 60, tags: ["posts"] },
);

/**
 * 按 slug 或 id 查已发布文章（公开访问），带标签。
 * 兼容旧数字 id 链接：先按 slug，若 identifier 为纯数字再按 id 兜底。
 */
export async function getPostByIdentifier(identifier: string): Promise<PostWithTags | null> {
  const numId = /^\d+$/.test(identifier) ? Number(identifier) : null;

  // 纯数字 identifier 只按 id 匹配：避免与数字 slug 混淆。
  // 若某文章 slug 恰好是纯数字（如 "5"），按 slug 查会与 /posts/<id> 冲突
  // 甚至引发重定向循环（详情页会对纯数字 identifier 重定向到 slug）。
  const conditions = numId !== null
    ? [eq(posts.id, numId)]
    : [eq(posts.slug, identifier)];

  const row = await db.query.posts.findFirst({
    where: and(eq(posts.status, "published"), or(...conditions)),
    with: { postTags: { with: { tag: true } } },
  });

  return row ? mapPostTags(row) : null;
}

/** 某篇文章已公开的评论（按时间正序） */
export async function getComments(postId: number): Promise<Comment[]> {
  return db
    .select()
    .from(comments)
    .where(and(eq(comments.post_id, postId), eq(comments.status, "approved")))
    .orderBy(asc(comments.created_at));
}

/** 全部标签 + 已发布文章数（按文章数倒序，只含至少一篇文章的标签）。缓存 60s + tag "posts" */
export const getTags = unstable_cache(
  async (): Promise<{ name: string; slug: string; count: number }[]> => {
    const rows = await db
      .select({
        name: tagsTable.name,
        slug: tagsTable.slug,
        count: sql<number>`count(${postTags.post_id})`,
      })
      .from(tagsTable)
      .leftJoin(postTags, eq(postTags.tag_id, tagsTable.id))
      .leftJoin(posts, and(eq(posts.id, postTags.post_id), eq(posts.status, "published")))
      .groupBy(tagsTable.id)
      .having(sql`count(${postTags.post_id}) > 0`) // 过滤无文章的空标签
      .orderBy(desc(sql`count`), asc(tagsTable.name));

    return rows.map((r) => ({ name: r.name, slug: r.slug, count: Number(r.count ?? 0) }));
  },
  ["all-tags"],
  { revalidate: 60, tags: ["posts"] },
);

/** 站点统计：已发布文章数 / 已通过评论数 / 总浏览量。缓存 60s + tag "posts"/"comments" */
export const getSiteStats = unstable_cache(
  async (): Promise<{ postCount: number; commentCount: number; totalViews: number }> => {
    const [postRow, commentRow, viewRow] = await Promise.all([
      db
        .select({ n: sql<number>`count(*)` })
        .from(posts)
        .where(eq(posts.status, "published")),
      db
        .select({ n: sql<number>`count(*)` })
        .from(comments)
        .where(eq(comments.status, "approved")),
      db
        .select({ n: sql<number>`coalesce(sum(${posts.view_count}), 0)` })
        .from(posts)
        .where(eq(posts.status, "published")),
    ]);
    return {
      postCount: Number(postRow[0]?.n ?? 0),
      commentCount: Number(commentRow[0]?.n ?? 0),
      totalViews: Number(viewRow[0]?.n ?? 0),
    };
  },
  ["site-stats"],
  { revalidate: 60, tags: ["posts", "comments"] },
);

/** 某标签下的已发布文章（分页），标签不存在返回空 */
export async function getPostsByTag(
  slug: string,
  page = 1,
  pageSize = PAGE_SIZE,
): Promise<{ tag: { name: string; slug: string } | null; posts: PostWithTags[]; total: number }> {
  const tag = await db.query.tags.findFirst({ where: eq(tagsTable.slug, slug) });
  if (!tag) return { tag: null, posts: [], total: 0 };

  const matchedPostIds = db
    .select({ postId: postTags.post_id })
    .from(postTags)
    .where(eq(postTags.tag_id, tag.id));

  const offset = (page - 1) * pageSize;
  const where = and(eq(posts.status, "published"), inArray(posts.id, matchedPostIds));

  const [rows, countRows] = await Promise.all([
    db.query.posts.findMany({
      where,
      with: { postTags: { with: { tag: true } } },
      orderBy: [desc(posts.created_at)],
      limit: pageSize,
      offset,
    }),
    db.select({ count: sql<number>`count(*)` }).from(posts).where(where),
  ]);

  return {
    tag: { name: tag.name, slug: tag.slug },
    posts: rows.map(mapPostTags),
    total: Number(countRows[0]?.count ?? 0),
  };
}

/** 搜索已发布文章（标题/摘要/正文 ILIKE），返回前 limit 条 */
export async function searchPosts(q: string, limit = 20): Promise<PostWithTags[]> {
  const pattern = `%${q.trim()}%`;
  const rows = await db.query.posts.findMany({
    where: and(
      eq(posts.status, "published"),
      or(
        ilike(posts.title, pattern),
        ilike(posts.excerpt, pattern),
        ilike(posts.content, pattern),
      ),
    ),
    with: { postTags: { with: { tag: true } } },
    orderBy: [desc(posts.created_at)],
    limit,
  });
  return rows.map(mapPostTags);
}

/** 归档条目（归档页展示用） */
export type ArchiveItem = {
  id: number;
  title: string;
  slug: string | null;
  excerpt: string | null;
  view_count: number;
  created_at: string;
};

/**
 * 按年月归档：返回 [{ year, month, items }]
 */
export async function getArchives(): Promise<
  { year: number; month: number; items: ArchiveItem[] }[]
> {
  const rows = await db
    .select({
      id: posts.id,
      title: posts.title,
      slug: posts.slug,
      excerpt: posts.excerpt,
      view_count: posts.view_count,
      created_at: posts.created_at,
    })
    .from(posts)
    .where(eq(posts.status, "published"))
    .orderBy(desc(posts.created_at));

  return groupArchivesByMonth(rows);
}

/** 按年月分组（纯函数，可单测）；rows 已按时间倒序 */
export function groupArchivesByMonth(
  rows: ArchiveItem[],
): { year: number; month: number; items: ArchiveItem[] }[] {
  const groups = new Map<string, { year: number; month: number; items: ArchiveItem[] }>();
  for (const row of rows) {
    const d = new Date(row.created_at);
    const key = `${d.getFullYear()}-${d.getMonth() + 1}`;
    const g = groups.get(key) ?? { year: d.getFullYear(), month: d.getMonth() + 1, items: [] };
    g.items.push(row);
    groups.set(key, g);
  }
  return [...groups.values()];
}

// 类型再导出（保持 import 兼容：`import type { Post } from "@/lib/posts"`）
export type { Post, Comment };
