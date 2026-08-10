// 全量重建文章向量索引：遍历已发布文章 → 切块 → embedding → 写入 article_chunks
// 用法：node scripts/index-posts.mjs（需要 EMBEDDING_API_KEY 环境变量或 .env.local）
import postgres from "postgres";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, "..");

// 读取 .env.local（DATABASE_URL + EMBEDDING_API_KEY）；CI 无 .env.local 时降级环境变量
let envContent = "";
try {
  envContent = readFileSync(join(rootDir, ".env.local"), "utf8");
} catch {
  // 无 .env.local（如 CI），仅用环境变量
}
const getEnv = (key) => {
  const m = envContent.match(new RegExp(`^${key}=(.*)$`, "m"));
  return (m?.[1]?.trim() || process.env[key]) ?? "";
};
const DATABASE_URL = getEnv("DATABASE_URL");
const EMBEDDING_API_KEY = getEnv("EMBEDDING_API_KEY");

if (!DATABASE_URL) {
  console.error("❌ 未找到 DATABASE_URL");
  process.exit(1);
}
if (!EMBEDDING_API_KEY) {
  console.error("❌ 未找到 EMBEDDING_API_KEY（硅基流动），无法向量化");
  process.exit(1);
}

const EMBEDDING_MODEL = "BAAI/bge-m3";
const EMBEDDING_URL = "https://api.siliconflow.cn/v1/embeddings";

function chunkText(text, chunkSize = 500, overlap = 50) {
  const paragraphs = text.split(/\n+/).map((p) => p.trim()).filter(Boolean);
  const chunks = [];
  let current = "";
  for (const p of paragraphs) {
    if (current && current.length + p.length > chunkSize) {
      chunks.push(current);
      current = overlap > 0 && current.length > overlap ? current.slice(-overlap) + "\n" + p : p;
    } else {
      current = current ? `${current}\n${p}` : p;
    }
  }
  if (current) chunks.push(current);
  return chunks;
}

async function embedTexts(texts) {
  const res = await fetch(EMBEDDING_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${EMBEDDING_API_KEY}` },
    body: JSON.stringify({ model: EMBEDDING_MODEL, input: texts }),
  });
  if (!res.ok) {
    const err = await res.text().catch(() => "");
    throw new Error(`Embedding 失败 (${res.status}): ${err.slice(0, 200)}`);
  }
  const data = await res.json();
  return (data.data ?? []).map((d) => d.embedding);
}

const sql = postgres(DATABASE_URL, { max: 1, connect_timeout: 15 });

try {
  const posts = await sql`select id, title, content from posts where status = 'published' order by id`;
  console.log(`共 ${posts.length} 篇已发布文章，开始索引…`);

  let totalChunks = 0;
  for (const post of posts) {
    const chunks = chunkText(post.content);
    if (!chunks.length) continue;

    // 分批 embedding（每批 10 块）
    const embeddings = [];
    for (let i = 0; i < chunks.length; i += 10) {
      const batch = chunks.slice(i, i + 10);
      const vecs = await embedTexts(batch);
      embeddings.push(...vecs);
    }

    // 先清旧分块再插入
    await sql`delete from article_chunks where post_id = ${post.id}`;
    for (let i = 0; i < chunks.length; i++) {
      await sql`
        insert into article_chunks (post_id, chunk_index, content, embedding)
        values (${post.id}, ${i}, ${chunks[i]}, ${`[${embeddings[i].join(",")}]`}::vector)
      `;
    }
    totalChunks += chunks.length;
    console.log(`  ✅ [${post.id}] ${post.title.slice(0, 30)} → ${chunks.length} 块`);
  }

  const [count] = await sql`select count(*)::int as n from article_chunks`;
  console.log(`✅ 索引完成：共 ${totalChunks} 块，表中 ${count.n} 块`);
} catch (error) {
  console.error("❌ 索引失败:", error.message);
  process.exitCode = 1;
} finally {
  await sql.end();
}
