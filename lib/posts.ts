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

  const conditions = [eq(posts.slug, identifier)];
  if (numId !== null) {
    conditions.push(eq(posts.id, numId));
  }

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

/** 全部标签 + 已发布文章数（按文章数倒序） */
export async function getTags(): Promise<{ name: string; slug: string; count: number }[]> {
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
    .orderBy(desc(sql`count`), asc(tagsTable.name));

  return rows.map((r) => ({ name: r.name, slug: r.slug, count: Number(r.count ?? 0) }));
}

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

/**
 * 按年月归档：返回 [{ year, month, items: [{id,title,slug,created_at}] }]
 */
export async function getArchives(): Promise<
  { year: number; month: number; items: { id: number; title: string; slug: string | null; created_at: string }[] }[]
> {
  const rows = await db
    .select({ id: posts.id, title: posts.title, slug: posts.slug, created_at: posts.created_at })
    .from(posts)
    .where(eq(posts.status, "published"))
    .orderBy(desc(posts.created_at));

  return groupArchivesByMonth(rows);
}

/** 按年月分组（纯函数，可单测）；rows 已按时间倒序 */
export function groupArchivesByMonth(
  rows: { id: number; title: string; slug: string | null; created_at: string }[],
): { year: number; month: number; items: { id: number; title: string; slug: string | null; created_at: string }[] }[] {
  const groups = new Map<string, { year: number; month: number; items: typeof rows }>();
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
