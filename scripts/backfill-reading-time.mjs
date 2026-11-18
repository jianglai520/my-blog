// 回填 posts.reading_minutes（一次性脚本）
// 用法：node scripts/backfill-reading-time.mjs
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

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
if (!DATABASE_URL) {
  console.error("缺少 DATABASE_URL");
  process.exit(1);
}

// 与 lib/format.ts 保持一致
function stripMarkdown(md) {
  return md
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`([^`]*)`/g, "$1")
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/^\s*[-*+]\s+/gm, "")
    .replace(/^\s*\d+\.\s+/gm, "")
    .replace(/^>\s?/gm, "")
    .replace(/^\s*[-_*]{3,}\s*$/gm, "")
    .replace(/(\*\*|__)(.*?)\1/g, "$2")
    .replace(/(\*|_)(.*?)\1/g, "$2")
    .replace(/~~(.*?)~~/g, "$1")
    .replace(/^\s*\|.*\|\s*$/gm, "")
    .replace(/\s+/g, " ")
    .trim();
}

function countWords(md) {
  const text = stripMarkdown(md);
  const cjk = text.match(/[\u4e00-\u9fa5\u3000-\u303f\uff00-\uffef]/g)?.length ?? 0;
  const latin = text.match(/[a-zA-Z0-9]+(?:['’-][a-zA-Z0-9]+)*/g)?.length ?? 0;
  return cjk + latin;
}

function readingMinutes(md) {
  const words = countWords(md);
  if (words <= 0) return 1;
  return Math.max(1, Math.round(words / 300));
}

const client = new pg.Client({
  connectionString: DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});
await client.connect();

try {
  const rows = await client.query("select id, content, reading_minutes from posts");
  let updated = 0;
  for (const row of rows.rows) {
    const minutes = readingMinutes(row.content ?? "");
    if (Number(row.reading_minutes) === minutes) continue;
    await client.query("update posts set reading_minutes = $1 where id = $2", [
      minutes,
      row.id,
    ]);
    updated++;
  }
  console.log(`回填完成：共 ${rows.rowCount} 篇，更新 ${updated} 篇`);
} finally {
  await client.end();
}
