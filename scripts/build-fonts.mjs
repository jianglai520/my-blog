// 生成自托管字体子集：Google Fonts -> public/fonts/*.woff2 + fonts.css
//
// 用法：
//   node scripts/build-fonts.mjs
//
// 做三件事：
//   1. 从文章/站点配置/源码收集实际用到的字符
//   2. 下载 Google Fonts 的完整 TTF，用 subset-font 生成 WOFF2 子集
//   3. 生成 public/fonts/fonts.css（文件名与字重固定，供 layout 引用）
//
// 注意：
// - 需要网络访问 fonts.googleapis.cn / fonts.gstatic.cn
// - 新增大量生僻字后重新运行一次即可；未包含的字会回退到系统字体
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import pg from "pg";
import subsetFont from "subset-font";

const execFileAsync = promisify(execFile);

const GF_CSS =
  "https://fonts.googleapis.cn/css2?family=Noto+Sans+SC:wght@400;500;700&family=Noto+Serif+SC:wght@400;600&family=Outfit:wght@400;600;700&family=JetBrains+Mono:wght@400;600&family=Ma+Shan+Zheng&display=swap";
const BROWSER_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";
// 用旧版 UA 让 Google 返回完整 TTF（现代 UA 会返回数百个 unicode-range 分片）
const LEGACY_UA = "Mozilla/5.0";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.join(__dirname, "..");
const outDir = path.join(rootDir, "public", "fonts");

async function readEnv(key) {
  try {
    const content = await fs.readFile(path.join(rootDir, ".env.local"), "utf8");
    const m = content.match(new RegExp(`^${key}=(.*)$`, "m"));
    if (m?.[1]) return m[1].trim();
  } catch {
    // ignore
  }
  return process.env[key] ?? "";
}

async function collectChars() {
  const set = new Set();
  for (let i = 0x20; i <= 0x7e; i++) set.add(String.fromCodePoint(i));

  // 文章 / 站点配置 / 留言 / 评论 / 私信
  const databaseUrl = await readEnv("DATABASE_URL");
  if (databaseUrl) {
    const client = new pg.Client({
      connectionString: databaseUrl,
      ssl: { rejectUnauthorized: false },
    });
    try {
      await client.connect();
      const queries = [
        "select content as t from posts",
        "select value as t from site_settings",
        "select content as t from comments",
        "select content as t from guestbook_messages",
        "select content as t from messages",
      ];
      for (const sql of queries) {
        const result = await client.query(sql);
        for (const row of result.rows) addChars(set, row.t ?? "");
      }
    } catch (error) {
      console.warn("读取数据库字符失败，只扫描源码:", error.message);
    } finally {
      await client.end().catch(() => {});
    }
  }

  // 源码里的中文 UI 文案
  async function walk(dir) {
    for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name === "node_modules" || entry.name.startsWith(".")) continue;
        await walk(full);
      } else if (entry.name.endsWith(".tsx") || entry.name.endsWith(".ts")) {
        addChars(set, await fs.readFile(full, "utf8"));
      }
    }
  }
  await walk(path.join(rootDir, "app"));
  await walk(path.join(rootDir, "lib"));

  return [...set].join("");
}

function addChars(set, text) {
  for (const ch of text) {
    if (/[\u4e00-\u9fff\u3000-\u303f\uff00-\uffef]/.test(ch)) set.add(ch);
  }
}

function slugify(family) {
  return family
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

/** 用 curl 抓取（Node fetch 访问 gstatic 会被 TLS 重置） */
async function curl(url, userAgent, encoding = "utf8") {
  const { stdout } = await execFileAsync(
    "curl",
    [
      "-sL",
      "--http1.1",
      "--retry",
      "5",
      "--retry-delay",
      "2",
      "--retry-all-errors",
      "-A",
      userAgent,
      url,
    ],
    { maxBuffer: 64 * 1024 * 1024, encoding },
  );
  return stdout;
}

async function main() {
  console.log("收集字符…");
  const chars = await collectChars();
  console.log(`字符数：${Array.from(chars).length}`);

  console.log("获取 Google Fonts CSS…");
  let cssText;
  try {
    cssText = await curl(GF_CSS, LEGACY_UA);
  } catch {
    // 网络不稳定时回退到仓库内的快照（只需在字体版本升级时更新）
    cssText = await fs.readFile(
      path.join(rootDir, "scripts", "fonts-source.css"),
      "utf8",
    );
    console.log("Google Fonts 不可达，使用本地 fonts-source.css");
  }

  const faces = [];
  for (const match of cssText.matchAll(/@font-face\s*\{([^}]+)\}/g)) {
    const body = match[1];
    const family = body.match(/font-family:\s*'([^']+)'/)?.[1];
    const weight = body.match(/font-weight:\s*([^;]+)/)?.[1]?.trim();
    const url = body.match(/url\((https:[^)]+)\)/)?.[1];
    if (family && weight && url) faces.push({ family, weight, url });
  }
  console.log(`字体面：${faces.length}`);

  await fs.mkdir(outDir, { recursive: true });

  // 毛笔字体只用于首页问候语，子集到这几个字符即可，避免 500KB+
  async function getBrushText() {
    const databaseUrl = await readEnv("DATABASE_URL");
    let authorName = "江来";
    if (databaseUrl) {
      const client = new pg.Client({
        connectionString: databaseUrl,
        ssl: { rejectUnauthorized: false },
      });
      try {
        await client.connect();
        const result = await client.query(
          "select value from site_settings where key = 'author_name' limit 1",
        );
        if (result.rows[0]?.value) authorName = result.rows[0].value;
      } catch {
        // 用默认署名
      } finally {
        await client.end().catch(() => {});
      }
    }
    return `你好，我是${authorName}，。！？0123456789`;
  }

  const brushText = await getBrushText();
  const cssLines = [];
  let total = 0;

  for (const face of faces) {
    const name = `${slugify(face.family)}-${face.weight}.woff2`;
    const target = path.join(outDir, name);
    process.stdout.write(`- ${face.family} ${face.weight} … `);

    let buffer;
    try {
      buffer = await curl(face.url, BROWSER_UA, "buffer");
    } catch {
      // fonts.gstatic.cn 偶发重置，退回 .com
      const altUrl = face.url.replace("fonts.gstatic.cn", "fonts.gstatic.com");
      buffer = await curl(altUrl, BROWSER_UA, "buffer");
    }
    const subsetText = face.family === "Ma Shan Zheng" ? brushText : chars;
    const subset = await subsetFont(buffer, subsetText, {
      targetFormat: "woff2",
    });
    await fs.writeFile(target, subset);
    total += subset.length;
    console.log(`${Math.round(subset.length / 1024)} KB`);

    cssLines.push(`@font-face {
  font-family: '${face.family}';
  font-style: normal;
  font-weight: ${face.weight};
  font-display: optional;
  src: url('/fonts/${name}') format('woff2');
}`);
  }

  await fs.writeFile(
    path.join(outDir, "fonts.css"),
    `/* 自动生成：scripts/build-fonts.mjs。请勿手改。 */\n${cssLines.join("\n")}\n`,
    "utf8",
  );

  console.log(`完成：${faces.length} 个字体文件，共 ${(total / 1024 / 1024).toFixed(2)} MB`);
}

await main();
