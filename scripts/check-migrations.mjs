// 迁移静态校验：编号唯一、常见 DDL 幂等、policy 可重复执行
// 用法：node scripts/check-migrations.mjs
// 说明：这是静态检查，不能替代在真实 Supabase 上执行；目标是把最常见的不幂等写法拦在 CI。

import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const DIR = "supabase/migrations";
const files = readdirSync(DIR)
  .filter((file) => file.endsWith(".sql"))
  .sort();

const errors = [];
const seen = new Map();

for (const file of files) {
  const numberMatch = file.match(/^(\d{4})_/);
  if (!numberMatch) {
    errors.push(`${file}: 文件名必须以 4 位数字开头，例如 0025_xxx.sql`);
    continue;
  }

  const number = Number(numberMatch[1]);
  if (seen.has(number)) {
    errors.push(`迁移编号重复：${String(number).padStart(4, "0")}（${seen.get(number)} 与 ${file}）`);
  }
  seen.set(number, file);

  const sql = readFileSync(join(DIR, file), "utf8");
  const lower = sql.toLowerCase();
  const unquoted = lower.replace(/"/g, "");

  for (const match of lower.matchAll(
    /create\s+(?:unlogged\s+)?table\s+(?!if\s+not\s+exists)([a-z0-9_."]+)/g,
  )) {
    errors.push(`${file}: create table ${match[1]} 缺少 if not exists`);
  }

  for (const match of lower.matchAll(
    /create\s+(?:unique\s+)?index\s+(?!concurrently\s+)?(?!if\s+not\s+exists)([a-z0-9_."]+)/g,
  )) {
    errors.push(`${file}: create index ${match[1]} 缺少 if not exists`);
  }

  for (const match of lower.matchAll(
    /drop\s+(?:table|index|policy|trigger|function)\s+(?!if\s+exists)([a-z0-9_."]+)/g,
  )) {
    errors.push(`${file}: drop ${match[1]} 缺少 if exists`);
  }

  for (const match of lower.matchAll(/create\s+policy\s+("?[a-z0-9_]+"?)\s+on/g)) {
    const name = match[1].replaceAll('"', "");
    if (!unquoted.includes(`drop policy if exists ${name}`)) {
      errors.push(`${file}: create policy ${name} 前缺少 drop policy if exists`);
    }
  }

  for (const match of lower.matchAll(
    /alter\s+table\s+[a-z0-9_."]+\s+add\s+column\s+(?!if\s+not\s+exists)([a-z0-9_"]+)/g,
  )) {
    errors.push(`${file}: add column ${match[1]} 缺少 if not exists`);
  }
}

if (errors.length) {
  console.error(`❌ 迁移检查发现 ${errors.length} 个问题：`);
  for (const error of errors) console.error(`  - ${error}`);
  process.exit(1);
}

console.log(`✅ ${files.length} 个迁移文件检查通过（编号唯一、常见 DDL 幂等）`);
