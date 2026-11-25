import { and, asc, desc, eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  guestbookMessages,
  replies as repliesTable,
  type GuestbookMessage,
  type Reply,
} from "@/db/schema";

export type GuestbookMessageWithReplies = GuestbookMessage & { replies: Reply[] };

/** 留言板留言（公开读，时间倒序，最新 200 条，附带游客回复） */
export async function getGuestbookMessages(): Promise<GuestbookMessageWithReplies[]> {
  const rows = await db
    .select()
    .from(guestbookMessages)
    .orderBy(desc(guestbookMessages.created_at))
    .limit(200);

  if (!rows.length) return [];

  const replyRows = await db
    .select()
    .from(repliesTable)
    .where(
      and(
        eq(repliesTable.target_type, "guestbook"),
        inArray(
          repliesTable.target_id,
          rows.map((row) => row.id),
        ),
      ),
    )
    .orderBy(asc(repliesTable.created_at));

  const byTarget = new Map<number, Reply[]>();
  for (const reply of replyRows) {
    const list = byTarget.get(reply.target_id) ?? [];
    list.push(reply);
    byTarget.set(reply.target_id, list);
  }

  return rows.map((message) => ({
    ...message,
    replies: byTarget.get(message.id) ?? [],
  }));
}
