// 数据备份脚本：导出全表 JSON 到 backups/ 目录（第一份真备份）
// 用法：node scripts/backup.mjs
// 需要环境变量 DATABASE_URL（在 .env.local 中，脚本自动读取）
import postgres from "postgres";
import { mkdirSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, "..");

// 读取 .env.local 中的 DATABASE_URL（避免手动 export）；CI 无 .env.local 时降级环境变量
import { readFileSync } from "node:fs";
let DATABASE_URL = process.env.DATABASE_URL ?? "";
try {
  const envContent = readFileSync(join(rootDir, ".env.local"), "utf8");
  const match = envContent.match(/^DATABASE_URL=(.*)$/m);
  if (match?.[1]) DATABASE_URL = match[1].trim();
} catch {
  // 无 .env.local（如 CI），使用环境变量
}

if (!DATABASE_URL) {
  console.error("❌ 未找到 DATABASE_URL（.env.local 或环境变量）");
  process.exit(1);
}

// 需要备份的表（按依赖顺序）
const TABLES = ["posts", "comments", "tags", "post_tags", "profiles", "site_settings"];

const sql = postgres(DATABASE_URL, { max: 1, connect_timeout: 15 });

try {
  console.log("开始备份…");
  const data = {};
  for (const table of TABLES) {
    // 用 sql() 标识符安全引用表名
    const rows = await sql`select * from ${sql(table)}`;
    data[table] = rows;
    console.log(`  ${table}: ${rows.length} 行`);
  }

  const backupDir = join(rootDir, "backups");
  mkdirSync(backupDir, { recursive: true });
  const filename = `${new Date().toISOString().slice(0, 10)}.json`;
  const filePath = join(backupDir, filename);
  writeFileSync(filePath, JSON.stringify(data, null, 2), "utf8");

  console.log(`✅ 备份完成: ${filePath}`);
  console.log("   恢复方式见 BACKUP.md（临时表/新项目重建演练）");
} catch (error) {
  console.error("❌ 备份失败:", error.message);
  process.exit(1);
} finally {
  await sql.end();
}
