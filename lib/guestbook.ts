import { desc } from "drizzle-orm";
import { db } from "@/lib/db";
import { guestbookMessages, type GuestbookMessage } from "@/db/schema";

/** 留言板留言（公开读，时间倒序，最新 200 条） */
export async function getGuestbookMessages(): Promise<GuestbookMessage[]> {
  return db
    .select()
    .from(guestbookMessages)
    .orderBy(desc(guestbookMessages.created_at))
    .limit(200);
}
