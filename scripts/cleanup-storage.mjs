// 清理 post-images 桶里的孤儿文件（未被任何文章/站点配置引用的对象）
// 用法：
//   node scripts/cleanup-storage.mjs                 预演，只打印不删除
//   node scripts/cleanup-storage.mjs --apply         删除超过 45 天的孤儿文件
//   node scripts/cleanup-storage.mjs --apply --days=30
//
// 需要的环境变量（本地读 .env.local，CI 读 secrets）：
//   DATABASE_URL
//   NEXT_PUBLIC_SUPABASE_URL
//   NEXT_PUBLIC_SUPABASE_ANON_KEY
//   TEST_EMAIL / TEST_PASSWORD（博主账号，用于 Storage 删除权限）
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";
import { createClient } from "@supabase/supabase-js";

const BUCKET = "post-images";
const APPLY = process.argv.includes("--apply");
const daysArg = process.argv.find((a) => a.startsWith("--days="));
const DAYS = Math.max(1, Number(daysArg?.split("=")[1]) || 45);

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, "..");
let envContent = "";
try {
  envContent = readFileSync(join(rootDir, ".env.local"), "utf8");
} catch {
  // CI 无 .env.local，仅用环境变量
}
const getEnv = (key) => {
  const m = envContent.match(new RegExp(`^${key}=(.*)$`, "m"));
  return (m?.[1]?.trim() || process.env[key]) ?? "";
};

const DATABASE_URL = getEnv("DATABASE_URL");
const SUPABASE_URL = getEnv("NEXT_PUBLIC_SUPABASE_URL");
const SUPABASE_ANON_KEY = getEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY");
const EMAIL = getEnv("TEST_EMAIL");
const PASSWORD = getEnv("TEST_PASSWORD");

for (const [key, value] of Object.entries({
  DATABASE_URL,
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
  TEST_EMAIL: EMAIL,
  TEST_PASSWORD: PASSWORD,
})) {
  if (!value) {
    console.error(`缺少环境变量：${key}`);
    process.exit(1);
  }
}

const formatBytes = (bytes) => {
  if (!bytes) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit++;
  }
  return `${value >= 100 || unit === 0 ? Math.round(value) : value.toFixed(1)} ${units[unit]}`;
};

const client = new pg.Client({
  connectionString: DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});
await client.connect();

try {
  // pg 单个 client 不支持并发 query，顺序执行
  const posts = await client.query("select content, cover_image from posts");
  const settings = await client.query("select value from site_settings");
  const files = await client.query(
    `select name, coalesce((metadata->>'size')::bigint, 0) as size, created_at
     from storage.objects where bucket_id = $1`,
    [BUCKET],
  );

  // 收集正文/封面/站点配置里引用的对象名
  const referenced = new Set();
  const URL_RE = /post-images\/([^\s"'()<>\\]+)/g;
  const collect = (text) => {
    if (!text) return;
    for (const match of text.matchAll(URL_RE)) {
      let name = match[1].split("?")[0].split("#")[0];
      try {
        name = decodeURIComponent(name);
      } catch {
        // 保留原样
      }
      referenced.add(name);
    }
  };
  for (const row of posts.rows) {
    collect(row.content);
    collect(row.cover_image);
  }
  for (const row of settings.rows) collect(row.value);

  const totalBytes = files.rows.reduce((sum, f) => sum + Number(f.size), 0);
  const cutoff = Date.now() - DAYS * 86_400_000;
  const orphans = files.rows.filter((f) => {
    if (referenced.has(f.name)) return false;
    return new Date(f.created_at).getTime() < cutoff;
  });
  const orphanBytes = orphans.reduce((sum, f) => sum + Number(f.size), 0);

  console.log(`桶：${BUCKET}`);
  console.log(`总文件：${files.rows.length}，总用量：${formatBytes(totalBytes)}`);
  console.log(`已引用：${referenced.size}，孤儿（>${DAYS} 天）：${orphans.length}，可释放：${formatBytes(orphanBytes)}`);

  // 安全护栏：如果一条引用都没解析到，说明正文格式异常，禁止删除
  if (referenced.size === 0 && files.rows.length > 0) {
    console.error("未解析到任何引用，疑似正文提取失败，已中止。");
    process.exit(2);
  }

  for (const f of orphans.slice(0, 20)) {
    console.log(`  - ${f.name} (${formatBytes(Number(f.size))})`);
  }
  if (orphans.length > 20) console.log(`  … 其余 ${orphans.length - 20} 个`);

  if (!APPLY) {
    console.log("\n预演模式：未删除任何文件。加 --apply 执行删除。");
  } else if (orphans.length === 0) {
    console.log("\n没有需要删除的文件。");
  } else {
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { error: authError } = await supabase.auth.signInWithPassword({
      email: EMAIL,
      password: PASSWORD,
    });
    if (authError) throw new Error(`登录失败：${authError.message}`);

    let deleted = 0;
    for (let i = 0; i < orphans.length; i += 100) {
      const chunk = orphans.slice(i, i + 100).map((f) => f.name);
      const { data, error } = await supabase.storage.from(BUCKET).remove(chunk);
      if (error) throw new Error(`删除失败：${error.message}`);
      deleted += data?.length ?? 0;
    }
    console.log(`\n已删除 ${deleted} 个孤儿文件，释放约 ${formatBytes(orphanBytes)}。`);
  }
} finally {
  await client.end();
}
