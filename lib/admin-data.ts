import "server-only";
import { desc, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  comments,
  guestbookMessages,
  messages,
  type Comment,
} from "@/db/schema";

/**
 * 后台数据读取（Drizzle 直连，一次往返拿完）。
 * 后台鉴权在页面/Server Action 层完成，这里只负责读，避免走多次 Supabase REST。
 */

export type AdminPostRow = {
  id: number;
  slug: string | null;
  title: string;
  excerpt: string | null;
  cover_image: string | null;
  created_at: string;
  published: boolean;
  status: string;
  pinned: boolean;
  post_tags: { tag: { name: string } }[];
};

export type AdminCounts = {
  posts: number;
  comments: number;
  guestbook: number;
  messages: number;
};

type RawPostRow = Omit<AdminPostRow, "post_tags"> & {
  post_tags: { tag: { name: string } }[] | null;
};

/** 文章元数据（不含正文）+ 四个计数，两个查询并发 */
export async function getAdminPostsAndCounts(): Promise<{
  posts: AdminPostRow[];
  counts: AdminCounts;
}> {
  const [postsResult, countsResult] = await Promise.all([
    db.execute(sql`
      select
        p.id,
        p.slug,
        p.title,
        p.excerpt,
        p.cover_image,
        p.created_at,
        p.published,
        p.status,
        p.pinned,
        coalesce(
          json_agg(json_build_object('tag', json_build_object('name', t.name)))
            filter (where t.id is not null),
          '[]'::json
        ) as post_tags
      from posts p
      left join post_tags pt on pt.post_id = p.id
      left join tags t on t.id = pt.tag_id
      group by p.id
      order by p.created_at desc
    `),
    db.execute(sql`
      select
        (select count(*)::int from posts) as posts,
        (select count(*)::int from comments) as comments,
        (select count(*)::int from guestbook_messages) as guestbook,
        (select count(*)::int from messages) as messages
    `),
  ]);

  const posts = (postsResult.rows ?? []).map((row) => {
    const raw = row as RawPostRow;
    return {
      ...raw,
      id: Number(raw.id),
      post_tags: raw.post_tags ?? [],
    };
  });

  const countsRow = (countsResult.rows?.[0] ?? {}) as Record<string, unknown>;
  return {
    posts,
    counts: {
      posts: Number(countsRow.posts ?? 0),
      comments: Number(countsRow.comments ?? 0),
      guestbook: Number(countsRow.guestbook ?? 0),
      messages: Number(countsRow.messages ?? 0),
    },
  };
}

/** 评论 / 留言 / 私信只在进入评论 Tab 时加载 */
export async function getAdminInbox(): Promise<{
  comments: Comment[];
  guestbook: (typeof guestbookMessages.$inferSelect)[];
  messages: (typeof messages.$inferSelect)[];
}> {
  const [commentRows, guestbookRows, messageRows] = await Promise.all([
    db.select().from(comments).orderBy(desc(comments.created_at)).limit(200),
    db
      .select()
      .from(guestbookMessages)
      .orderBy(desc(guestbookMessages.created_at))
      .limit(200),
    db.select().from(messages).orderBy(desc(messages.created_at)).limit(100),
  ]);

  return {
    comments: commentRows,
    guestbook: guestbookRows,
    messages: messageRows,
  };
}
