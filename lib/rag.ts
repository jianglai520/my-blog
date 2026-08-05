import { db } from "@/lib/db";
import { sql } from "drizzle-orm";
import { embedTexts, chunkText } from "@/lib/ai";

/**
 * AI 问答 RAG：文章分块 → embedding 存储 / 检索。
 * - 公开读（检索）：Drizzle 直连 pgvector 余弦相似度
 * - 写（索引同步）：由 Server Action 在博主会话内调用（RLS 允许 is_admin 写）
 */

export const CHUNK_SIZE = 500;
export const CHUNK_OVERLAP = 50;
export const TOP_K = 5; // 检索返回最相关块数

export type RetrievedChunk = { post_id: number; content: string; similarity: number };

/** 向量检索：questionEmbedding → pgvector 余弦相似度 Top K */
export async function searchChunks(
  questionEmbedding: number[],
  topK = TOP_K,
): Promise<RetrievedChunk[]> {
  const vecText = `[${questionEmbedding.join(",")}]`;
  const rows = await db.execute(
    sql`
      select post_id, content, 1 - (embedding <=> ${vecText}::vector) as similarity
      from article_chunks
      order by embedding <=> ${vecText}::vector
      limit ${topK}
    `,
  );
  return (rows.rows ?? []).map((r) => ({
    post_id: Number(r.post_id),
    content: String(r.content),
    similarity: Number(r.similarity),
  }));
}

/** 同步单篇文章分块索引：删旧 → 切块 → embedding → 插入（博主会话 + RLS） */
export async function syncPostChunks(
  supabase: Awaited<ReturnType<typeof import("@/lib/server/supabase").getServerSupabase>>,
  postId: number,
  content: string,
): Promise<void> {
  await supabase.from("article_chunks").delete().eq("post_id", postId);

  const chunks = chunkText(content, CHUNK_SIZE, CHUNK_OVERLAP);
  if (!chunks.length) return;

  const embeddings = await embedTexts(chunks);

  const rows = chunks.map((text, i) => ({
    post_id: postId,
    chunk_index: i,
    content: text,
    embedding: embeddings[i],
  }));
  const { error } = await supabase.from("article_chunks").insert(rows);
  if (error) console.error("同步文章分块失败:", error.message);
}

/** 删除文章的索引分块（外键级联已兜底，显式调用更保险） */
export async function deletePostChunks(
  supabase: Awaited<ReturnType<typeof import("@/lib/server/supabase").getServerSupabase>>,
  postId: number,
): Promise<void> {
  await supabase.from("article_chunks").delete().eq("post_id", postId);
}
