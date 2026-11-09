#!/usr/bin/env node
/**
 * 文章 Markdown 体检：扫描数据库 posts，检测被编辑器压平的表格与未闭合代码围栏。
 * 用法：npm run check:markdown
 *
 * 说明：WYSIWYG 编辑器缺少表格扩展时，粘贴 Markdown 会把表格压平成段落。
 * 这里用「已知压平表头 + 代码围栏配对」做低成本巡检；发现后请用源码模式修复。
 */
import fs from "node:fs";
import pg from "pg";

function loadDbUrl() {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  try {
    const env = fs.readFileSync(".env.local", "utf8");
    const m = env.match(/^DATABASE_URL=(.*)$/m);
    if (m) return m[1].trim();
  } catch {
    // ignore
  }
  throw new Error("缺少 DATABASE_URL（.env.local 或环境变量）");
}

const FLATTENED_HEADERS = [
  "项目内容",
  "角色说明",
  "类型什么时候",
  "模式说明",
  "问题处理",
  "命令作用",
  "术语含义",
  "需求命令",
  "能力原用途",
  "命令用途",
  "类别插件包说明",
  "原语谁触发用途",
  "语言最新版本安装备注",
  "版本关键变化",
  "维度OpenClaw",
  "原清单本精简版",
];

const client = new pg.Client({
  connectionString: loadDbUrl(),
  ssl: { rejectUnauthorized: false },
});
await client.connect();
const { rows } = await client.query(
  "select id, title, content from posts order by id",
);

let issues = 0;
for (const post of rows) {
  const content = post.content || "";
  const found = [];

  for (const key of FLATTENED_HEADERS) {
    if (content.includes(key)) found.push(`压平表头：${key}`);
  }

  const fences = (content.match(/```/g) || []).length;
  if (fences % 2 !== 0) found.push(`代码围栏不成对：${fences}`);

  if (found.length) {
    issues += found.length;
    console.log(`\n✗ post ${post.id} | ${post.title}`);
    for (const f of found) console.log("  -", f);
  }
}

await client.end();

if (issues) {
  console.log(`\n共发现 ${issues} 处可疑内容，请用「源码模式」修复后再发布。`);
  process.exitCode = 1;
} else {
  console.log("✓ 所有文章的 Markdown 结构正常。");
}
