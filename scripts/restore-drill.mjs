// 备份恢复演练脚本：验证 backups/*.json 能否完整恢复（临时 schema，不碰生产表）
// 用法：node scripts/restore-drill.mjs
// 流程：读最新备份 → 建临时 schema restore_test → 复制表结构 + 插入数据 → 校验行数 → 清理
// 需要环境变量 DATABASE_URL（自动读取 .env.local）
import postgres from "postgres";
import { readFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, "..");

// 读取 .env.local 中的 DATABASE_URL；CI 无 .env.local 时降级环境变量
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

// 取最新的备份文件
const backupDir = join(rootDir, "backups");
const files = readdirSync(backupDir)
  .filter((f) => f.endsWith(".json"))
  .sort()
  .reverse();
if (!files.length) {
  console.error("❌ backups/ 下没有备份文件，请先运行 node scripts/backup.mjs");
  process.exit(1);
}

const backupFile = files[0];
const data = JSON.parse(readFileSync(join(backupDir, backupFile), "utf8"));

const sql = postgres(DATABASE_URL, { max: 1, connect_timeout: 15 });
const SCHEMA = "restore_test";

let failed = false;

try {
  console.log(`📦 演练用备份：${backupFile}（${Object.keys(data).length} 张表）\n`);

  // 1. 清理并重建临时 schema（幂等，绝不触碰生产表）
  await sql`drop schema if exists ${sql(SCHEMA)} cascade`;
  await sql`create schema ${sql(SCHEMA)}`;

  for (const [table, rows] of Object.entries(data)) {
    if (!Array.isArray(rows) || rows.length === 0) {
      console.log(`  ⏭  ${table}: 备份为 0 行，跳过`);
      continue;
    }

    // 2. 复制表结构（含默认值/约束）；表名来自备份文件 key（可信），用 unsafe 规避 postgres-js 的 fragment 组合 bug
    await sql.unsafe(
      `create table "${SCHEMA}"."${table}" (like public."${table}" including defaults including constraints)`,
    );

    // 3. 插入全部行（逐行参数化；列名来自备份文件 key，可信）
    const cols = Object.keys(rows[0]);
    const colList = cols.map((c) => `"${c}"`).join(", ");
    const placeholders = cols.map((_, i) => `$${i + 1}`).join(", ");
    for (const row of rows) {
      const vals = cols.map((c) => row[c]);
      await sql.unsafe(
        `insert into "${SCHEMA}"."${table}" (${colList}) values (${placeholders})`,
        vals,
      );
    }

    // 4. 校验行数一致
    const [countRow] = await sql.unsafe(
      `select count(*)::int as n from "${SCHEMA}"."${table}"`,
    );
    const restored = Number(countRow.n);
    const ok = restored === rows.length;
    if (!ok) failed = true;
    console.log(`  ${ok ? "✅" : "❌"} ${table}: 备份 ${rows.length} 行 → 恢复 ${restored} 行`);
  }

  console.log(failed ? "\n❌ 演练失败：存在行数不一致" : "\n✅ 演练通过：备份文件完整可恢复");
} catch (error) {
  console.error("\n❌ 演练异常:", error.message);
  process.exitCode = 1;
} finally {
  // 5. 清理临时 schema（不污染生产库）
  try {
    await sql`drop schema if exists ${sql(SCHEMA)} cascade`;
    console.log("🧹 临时 schema 已清理");
  } catch (e) {
    console.error("清理临时 schema 失败:", e.message);
  }
  await sql.end();
}
