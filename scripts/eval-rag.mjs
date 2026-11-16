// RAG 检索评测：Recall@5 / MRR@5 / P95 延迟
// 用法：node scripts/eval-rag.mjs
//
// 说明：
// - 只评测「检索」效果（不调用生成模型，避免 token 成本）
// - 检索逻辑与 lib/rag.ts 保持一致：向量 Top8 + 关键词 Top8，融合后 Top5
// - 需要 .env.local 或环境变量：DATABASE_URL、EMBEDDING_API_KEY
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const VECTOR_CANDIDATES = 8;
const KEYWORD_CANDIDATES = 8;
const TOP_K = 5;
const VECTOR_WEIGHT = 0.7;
const KEYWORD_WEIGHT = 0.3;
const MAX_CHUNKS_PER_POST = 2;

const STOP_BIGRAMS = new Set([
  "怎么", "如何", "什么", "为何", "为什", "可以", "是否", "一下",
  "区别", "作用", "哪些", "这个", "那个", "我们", "你们", "它们",
  "介绍", "讲解", "详细",
]);

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, "..");
let envContent = "";
try {
  envContent = readFileSync(join(rootDir, ".env.local"), "utf8");
} catch {
  // CI 仅用环境变量
}
const getEnv = (key) => {
  const m = envContent.match(new RegExp(`^${key}=(.*)$`, "m"));
  return (m?.[1]?.trim() || process.env[key]) ?? "";
};

const DATABASE_URL = getEnv("DATABASE_URL");
const EMBEDDING_API_KEY = getEnv("EMBEDDING_API_KEY");
if (!DATABASE_URL || !EMBEDDING_API_KEY) {
  console.error("缺少 DATABASE_URL 或 EMBEDDING_API_KEY");
  process.exit(1);
}

function extractKeywords(query) {
  const terms = new Set();
  for (const match of query.matchAll(/[A-Za-z][A-Za-z0-9.+#-]*/g)) {
    if (match[0].length >= 2) terms.add(match[0].toLowerCase());
  }
  const segments = query.match(/[\p{Script=Han}]+/gu) ?? [];
  for (const segment of segments) {
    for (let i = 0; i < segment.length - 1; i++) {
      const bigram = segment.slice(i, i + 2);
      if (!STOP_BIGRAMS.has(bigram)) terms.add(bigram);
    }
  }
  return [...terms].slice(0, 6);
}

const questions = readFileSync(
  join(rootDir, "data/eval/rag-qa.jsonl"),
  "utf8",
)
  .split("\n")
  .map((line) => line.trim())
  .filter(Boolean)
  .map((line) => JSON.parse(line));

// 批量向量化
const embedRes = await fetch("https://api.siliconflow.cn/v1/embeddings", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${EMBEDDING_API_KEY}`,
  },
  body: JSON.stringify({
    model: "BAAI/bge-m3",
    input: questions.map((q) => q.question),
  }),
  signal: AbortSignal.timeout(60_000),
});
if (!embedRes.ok) {
  console.error("Embedding 请求失败:", embedRes.status, await embedRes.text());
  process.exit(1);
}
const embedData = await embedRes.json();
const embeddings = (embedData.data ?? [])
  .slice()
  .sort((a, b) => (a.index ?? 0) - (b.index ?? 0))
  .map((d) => d.embedding);
if (embeddings.length !== questions.length) {
  console.error(`Embedding 数量不匹配：${embeddings.length}/${questions.length}`);
  process.exit(1);
}

const client = new pg.Client({
  connectionString: DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});
await client.connect();

async function retrieve(embedding, question) {
  const vec = `[${embedding.join(",")}]`;
  const candidates = new Map();

  const vectorRes = await client.query(
    `select c.post_id, c.chunk_index, 1 - (c.embedding <=> $1::vector) as similarity
     from article_chunks c join posts p on p.id = c.post_id
     where p.status = 'published'
     order by c.embedding <=> $1::vector
     limit $2`,
    [vec, VECTOR_CANDIDATES],
  );
  for (const row of vectorRes.rows) {
    const key = `${row.post_id}:${row.chunk_index}`;
    candidates.set(key, {
      post_id: Number(row.post_id),
      similarity: Number(row.similarity),
      keyword_score: 0,
      fromVector: true,
      fromKeyword: false,
    });
  }

  const keywords = extractKeywords(question);
  if (keywords.length > 0) {
    const sims = keywords.map((_, i) => `similarity(c.content, $${i + 2})`);
    const conds = keywords.map(
      (_, i) =>
        `(c.content ilike $${keywords.length + 2 + i} or p.title ilike $${keywords.length + 2 + i})`,
    );
    const params = [
      vec,
      ...keywords,
      ...keywords.map((k) => `%${k}%`),
      KEYWORD_CANDIDATES,
    ];
    const keywordRes = await client.query(
      `select c.post_id, c.chunk_index,
              1 - (c.embedding <=> $1::vector) as similarity,
              greatest(${sims.join(", ")}) as keyword_score
       from article_chunks c join posts p on p.id = c.post_id
       where p.status = 'published' and (${conds.join(" or ")})
       order by keyword_score desc, similarity desc
       limit $${params.length}`,
      params,
    );
    for (const row of keywordRes.rows) {
      const key = `${row.post_id}:${row.chunk_index}`;
      const existing = candidates.get(key);
      const keywordScore = Number(row.keyword_score) || 0;
      if (existing) {
        existing.fromKeyword = true;
        existing.keyword_score = Math.max(existing.keyword_score, keywordScore);
      } else {
        candidates.set(key, {
          post_id: Number(row.post_id),
          similarity: Number(row.similarity),
          keyword_score: keywordScore,
          fromVector: false,
          fromKeyword: true,
        });
      }
    }
  }

  const perPost = new Map();
  const picked = [];
  const sorted = [...candidates.values()].sort(
    (a, b) =>
      VECTOR_WEIGHT * b.similarity + KEYWORD_WEIGHT * b.keyword_score -
      (VECTOR_WEIGHT * a.similarity + KEYWORD_WEIGHT * a.keyword_score),
  );
  for (const item of sorted) {
    const used = perPost.get(item.post_id) ?? 0;
    if (used >= MAX_CHUNKS_PER_POST) continue;
    perPost.set(item.post_id, used + 1);
    picked.push(item);
    if (picked.length >= TOP_K) break;
  }
  return picked;
}

let answerable = 0;
let hit = 0;
let reciprocalRank = 0;
const latencies = [];
const misses = [];
const refusalSimilarities = [];

for (let i = 0; i < questions.length; i++) {
  const item = questions[i];
  const start = performance.now();
  const chunks = await retrieve(embeddings[i], item.question);
  const elapsed = performance.now() - start;
  latencies.push(elapsed);

  const uniquePosts = [...new Set(chunks.map((c) => c.post_id))];
  const maxSimilarity = chunks.reduce(
    (max, c) => Math.max(max, c.similarity),
    0,
  );

  if (item.should_refuse) {
    refusalSimilarities.push(maxSimilarity);
    continue;
  }

  answerable++;
  const expected = new Set(item.expected_post_ids.map(Number));
  const rank = uniquePosts.findIndex((id) => expected.has(id));
  if (rank >= 0) {
    hit++;
    reciprocalRank += 1 / (rank + 1);
  } else {
    misses.push({ id: item.id, question: item.question, top: uniquePosts });
  }
}

latencies.sort((a, b) => a - b);
const p95 = latencies[Math.max(0, Math.ceil(latencies.length * 0.95) - 1)] ?? 0;
const avgRefusal =
  refusalSimilarities.reduce((a, b) => a + b, 0) /
  Math.max(1, refusalSimilarities.length);

console.log("=== RAG 检索评测 ===");
console.log(`题目：${questions.length}（可回答 ${answerable}，拒答 ${refusalSimilarities.length}）`);
console.log(`Recall@${TOP_K}: ${(hit / Math.max(1, answerable)).toFixed(3)}`);
console.log(`MRR@${TOP_K}: ${(reciprocalRank / Math.max(1, answerable)).toFixed(3)}`);
console.log(`检索延迟 P95: ${p95.toFixed(0)} ms`);
console.log(`拒答题最高相似度均值: ${avgRefusal.toFixed(3)}（仅作参考，未做阈值判定）`);

if (misses.length > 0) {
  console.log("\n未命中题目：");
  for (const miss of misses) {
    console.log(`- ${miss.id} ${miss.question} → top: [${miss.top.join(", ")}]`);
  }
}

await client.end();
