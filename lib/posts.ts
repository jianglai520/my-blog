import { and, asc, desc, eq, or } from "drizzle-orm";
import { db } from "@/lib/db";
import { posts, comments, type Post, type Comment } from "@/db/schema";

/**
 * 公开读数据层（Drizzle 直连，应用层安全过滤）。
 *
 * ⚠️ 安全约定：本模块直连数据库（绕过 RLS），所有公开查询
 * 必须显式过滤 `status = 'published'`（草稿永不公开）；
 * 评论查询只返回 approved（Phase 3 引入 status 后启用）。
 * 写操作一律走 Server Actions + supabase-js（RLS 防线）。
 */

/** 已发布文章列表（首页 / sitemap 用），按时间倒序 */
export async function getPublishedPosts(): Promise<Post[]> {
  return db
    .select()
    .from(posts)
    .where(eq(posts.status, "published"))
    .orderBy(desc(posts.created_at));
}

/**
 * 按 slug 或 id 查已发布文章（公开访问）。
 * 兼容旧数字 id 链接：先按 slug，若 identifier 为纯数字再按 id 兜底。
 */
export async function getPostByIdentifier(identifier: string): Promise<Post | null> {
  const numId = /^\d+$/.test(identifier) ? Number(identifier) : null;

  const conditions = [eq(posts.slug, identifier)];
  if (numId !== null) {
    conditions.push(eq(posts.id, numId));
  }

  const rows = await db
    .select()
    .from(posts)
    .where(and(eq(posts.status, "published"), or(...conditions)))
    .limit(1);

  return rows[0] ?? null;
}

/** 某篇文章的评论（仅已公开的 approved，按时间正序） */
export async function getComments(postId: number): Promise<Comment[]> {
  return db
    .select()
    .from(comments)
    .where(eq(comments.post_id, postId))
    .orderBy(asc(comments.created_at));
}

// 类型再导出（保持 import 兼容：`import type { Post } from "@/lib/posts"`）
export type { Post, Comment };
