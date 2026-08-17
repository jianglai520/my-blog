// 文章向量索引同步脚本（发布异步化的配套任务）
// 用法：
//   node scripts/index-posts.mjs            全量重建（遍历所有已发布文章）
//   node scripts/index-posts.mjs --incremental  增量：只处理 index_status='pending' 的文章，完成后标 done
// 需要 EMBEDDING_API_KEY 环境变量或 .env.local
import postgres from "postgres";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const INCREMENTAL = process.argv.includes("--incremental");

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
  // 增量模式只处理 pending 文章；全量模式处理所有已发布
  const posts = INCREMENTAL
    ? await sql`select id, title, content from posts where status = 'published' and index_status = 'pending' order by id`
    : await sql`select id, title, content from posts where status = 'published' order by id`;
  console.log(
    INCREMENTAL
      ? `增量模式：共 ${posts.length} 篇待索引文章`
      : `共 ${posts.length} 篇已发布文章，开始索引…`,
  );

  let totalChunks = 0;
  let success = 0;
  let failed = 0;
  for (const post of posts) {
    try {
      const chunks = chunkText(post.content);
      if (chunks.length) {
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
      }
      // 成功：标记 done
      await sql`update posts set index_status = 'done' where id = ${post.id}`;
      success++;
      console.log(`  ✅ [${post.id}] ${post.title.slice(0, 30)} → ${chunks.length} 块`);
    } catch (e) {
      // 失败：标记 failed（定时任务下次可重试）
      await sql`update posts set index_status = 'failed' where id = ${post.id}`;
      failed++;
      console.error(`  ❌ [${post.id}] ${post.title.slice(0, 30)}: ${e.message}`);
    }
  }

  const [count] = await sql`select count(*)::int as n from article_chunks`;
  console.log(
    `✅ 索引完成：成功 ${success}，失败 ${failed}，新增 ${totalChunks} 块，表中 ${count.n} 块`,
  );
} catch (error) {
  console.error("❌ 索引失败:", error.message);
  process.exitCode = 1;
} finally {
  await sql.end();
}
