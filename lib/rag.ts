import { db } from "@/lib/db";
import { sql } from "drizzle-orm";
import { embedTexts, chunkText } from "@/lib/ai";

/**
 * AI 问答 RAG：文章分块 → embedding 存储 / 混合检索。
 * - 公开读（检索）：Drizzle 直连 pgvector + pg_trgm
 * - 写（索引同步）：由 Server Action 在博主会话内调用（RLS 允许 is_admin 写）
 *
 * 检索策略（混合检索）：
 *   1. 向量召回：余弦相似度 Top 8
 *   2. 关键词召回：正文/标题 ILIKE 命中，按 trgm similarity 排序 Top 8
 *   3. 融合分数：0.7 × 向量相似度 + 0.3 × 关键词相似度
 *   4. 同一篇文章最多保留 2 个分块，避免上下文被单篇占满
 *   5. 取融合分 Top K（默认 5）
 */

export const CHUNK_SIZE = 500;
export const CHUNK_OVERLAP = 50;
export const TOP_K = 5;
const VECTOR_CANDIDATES = 8;
const KEYWORD_CANDIDATES = 8;
const VECTOR_WEIGHT = 0.7;
const KEYWORD_WEIGHT = 0.3;
const MAX_CHUNKS_PER_POST = 2;

/** 中文停用双字词，避免关键词召回被“怎么/什么/可以”等噪声主导 */
const STOP_BIGRAMS = new Set([
  "怎么",
  "如何",
  "什么",
  "为何",
  "为什",
  "可以",
  "是否",
  "一下",
  "区别",
  "作用",
  "哪些",
  "这个",
  "那个",
  "我们",
  "你们",
  "它们",
  "介绍",
  "讲解",
  "详细",
]);

/**
 * 从自然语言问题里提取检索关键词：
 * - 英文/技术术语整词保留（Redis、MySQL、HTTP、GitHub Actions）
 * - 中文按双字滑窗切分，过滤常见疑问词
 * - 最多 6 个，避免 SQL 条件过长
 */
export function extractKeywords(query: string): string[] {
  const terms = new Set<string>();

  for (const match of query.matchAll(/[A-Za-z][A-Za-z0-9.+#-]*/g)) {
    if (match[0].length >= 2) terms.add(match[0].toLowerCase());
  }

  const chineseSegments = query.match(/[\p{Script=Han}]+/gu) ?? [];
  for (const segment of chineseSegments) {
    for (let i = 0; i < segment.length - 1; i++) {
      const bigram = segment.slice(i, i + 2);
      if (!STOP_BIGRAMS.has(bigram)) terms.add(bigram);
    }
  }

  return [...terms].slice(0, 6);
}

export type RetrievedChunk = {
  post_id: number;
  title: string;
  slug: string | null;
  content: string;
  chunk_index: number;
  /** 向量余弦相似度 0~1 */
  similarity: number;
  /** 关键词 trgm 相似度 0~1 */
  keyword_score: number;
  source: "vector" | "keyword" | "hybrid";
};

type CandidateRow = {
  post_id: number | string;
  title: string;
  slug: string | null;
  content: string;
  chunk_index: number | string;
  similarity: number | string;
  keyword_score?: number | string;
};

function toCandidate(
  row: CandidateRow,
  origin: "vector" | "keyword",
): RetrievedChunk & { score: number; fromVector: boolean; fromKeyword: boolean } {
  const similarity = Number(row.similarity) || 0;
  const keywordScore = Number(row.keyword_score ?? 0) || 0;
  return {
    post_id: Number(row.post_id),
    title: String(row.title),
    slug: row.slug ?? null,
    content: String(row.content),
    chunk_index: Number(row.chunk_index),
    similarity,
    keyword_score: keywordScore,
    source: origin,
    score: VECTOR_WEIGHT * similarity + KEYWORD_WEIGHT * keywordScore,
    fromVector: origin === "vector",
    fromKeyword: origin === "keyword",
  };
}

/**
 * 混合检索。只返回已发布文章的分块。
 * query 用于关键词召回；问题过短时只走向量召回。
 */
export async function searchChunks(
  questionEmbedding: number[],
  query: string,
  topK = TOP_K,
): Promise<RetrievedChunk[]> {
  const vecText = `[${questionEmbedding.join(",")}]`;
  const trimmed = query.trim();

  const vectorRows = await db.execute(sql`
    select
      c.post_id,
      c.chunk_index,
      c.content,
      p.title,
      p.slug,
      1 - (c.embedding <=> ${vecText}::vector) as similarity
    from article_chunks c
    join posts p on p.id = c.post_id
    where p.status = 'published'
    order by c.embedding <=> ${vecText}::vector
    limit ${VECTOR_CANDIDATES}
  `);

  const candidates = new Map<
    string,
    RetrievedChunk & { score: number; fromVector: boolean; fromKeyword: boolean }
  >();

  for (const row of (vectorRows.rows ?? []) as CandidateRow[]) {
    const candidate = toCandidate(row, "vector");
    candidates.set(`${candidate.post_id}:${candidate.chunk_index}`, candidate);
  }

  // 关键词召回：从自然语言问题提取术语/中文双字词
  const keywords = extractKeywords(trimmed);
  if (keywords.length > 0) {
    const likeConditions = keywords.map(
      (keyword) =>
        sql`(c.content ilike ${`%${keyword}%`} or p.title ilike ${`%${keyword}%`})`,
    );
    const similarities = keywords.map(
      (keyword) => sql`similarity(c.content, ${keyword})`,
    );

    const keywordRows = await db.execute(sql`
      select
        c.post_id,
        c.chunk_index,
        c.content,
        p.title,
        p.slug,
        1 - (c.embedding <=> ${vecText}::vector) as similarity,
        greatest(${sql.join(similarities, sql`, `)}) as keyword_score
      from article_chunks c
      join posts p on p.id = c.post_id
      where p.status = 'published'
        and (${sql.join(likeConditions, sql` or `)})
      order by keyword_score desc, similarity desc
      limit ${KEYWORD_CANDIDATES}
    `);

    for (const row of (keywordRows.rows ?? []) as CandidateRow[]) {
      const incoming = toCandidate(row, "keyword");
      const key = `${incoming.post_id}:${incoming.chunk_index}`;
      const existing = candidates.get(key);
      if (existing) {
        // 同一分块同时被向量和关键词召回 → 合并为 hybrid
        existing.fromKeyword = true;
        existing.keyword_score = Math.max(
          existing.keyword_score,
          incoming.keyword_score,
        );
        existing.score =
          VECTOR_WEIGHT * existing.similarity +
          KEYWORD_WEIGHT * existing.keyword_score;
      } else {
        candidates.set(key, incoming);
      }
    }
  }

  // 融合排序 + 单篇上限，避免上下文被同一篇文章占满
  const perPost = new Map<number, number>();
  const picked: RetrievedChunk[] = [];
  for (const candidate of [...candidates.values()].sort((a, b) => b.score - a.score)) {
    const used = perPost.get(candidate.post_id) ?? 0;
    if (used >= MAX_CHUNKS_PER_POST) continue;
    perPost.set(candidate.post_id, used + 1);

    const source: RetrievedChunk["source"] =
      candidate.fromVector && candidate.fromKeyword
        ? "hybrid"
        : candidate.fromKeyword
          ? "keyword"
          : "vector";

    picked.push({
      post_id: candidate.post_id,
      title: candidate.title,
      slug: candidate.slug,
      content: candidate.content,
      chunk_index: candidate.chunk_index,
      similarity: candidate.similarity,
      keyword_score: candidate.keyword_score,
      source,
    });

    if (picked.length >= topK) break;
  }

  return picked;
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
