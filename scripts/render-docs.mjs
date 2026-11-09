// 把桌面文档目录里的 Markdown 批量渲染成 HTML（带文档索引）
// 用法：node scripts/render-docs.mjs "C:/Users/如玧/Desktop/my-blog搭建"
import fs from "node:fs/promises";
import path from "node:path";
import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
import remarkRehype from "remark-rehype";
import rehypeStringify from "rehype-stringify";

const dir = process.argv[2] || "C:/Users/如玧/Desktop/my-blog搭建";

const parser = unified()
  .use(remarkParse)
  .use(remarkGfm)
  .use(remarkRehype)
  .use(rehypeStringify);

function esc(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

const baseCss = `
:root{--brand:#35bfab;--cyan:#1fc9e7;--fg:#334f52;--muted:#7b888e;--line:#dbe3e1}
*{box-sizing:border-box}
body{margin:0;padding:40px 20px 80px;color:var(--fg);font-family:"Noto Serif SC","Songti SC","SimSun",serif;
background:radial-gradient(60rem 40rem at 85% -10%,rgba(53,191,171,.14),transparent 60%),
radial-gradient(50rem 34rem at -10% 110%,rgba(31,201,231,.12),transparent 55%),#eeeeee}
.page{max-width:900px;margin:0 auto}
.topbar{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:16px;font-size:13px}
.topbar a{color:#1f8f7e;text-decoration:none}
.topbar a:hover{text-decoration:underline}
.badge{font-family:"JetBrains Mono",monospace;font-size:11px;color:var(--muted);white-space:nowrap}
.doc{background:rgba(255,255,255,.72);backdrop-filter:blur(16px);border:1px solid rgba(255,255,255,.85);
border-radius:18px;padding:48px 52px;box-shadow:0 8px 32px rgba(51,79,82,.10)}
.doc h1{font-size:2.1rem;margin:0 0 1.2rem;letter-spacing:-.01em}
.doc h2{font-size:1.55rem;margin:2.4rem 0 1rem;padding-bottom:.45rem;border-bottom:2px solid rgba(53,191,171,.25)}
.doc h3{font-size:1.25rem;margin:1.8rem 0 .8rem}
.doc h4{font-size:1.08rem;margin:1.4rem 0 .6rem}
.doc p,.doc li{line-height:1.95}
.doc p{margin:.9rem 0}
.doc ul,.doc ol{padding-left:1.6rem;margin:.9rem 0}
.doc li{margin:.35rem 0}
.doc a{color:#1f8f7e;text-decoration:underline;text-underline-offset:3px;text-decoration-color:rgba(53,191,171,.4)}
.doc a:hover{text-decoration-color:rgba(53,191,171,.8)}
.doc strong{color:#2f3b3c}
.doc blockquote{margin:1.4rem 0;padding:.8rem 1.2rem;border-left:4px solid var(--brand);
background:rgba(53,191,171,.08);border-radius:0 10px 10px 0;color:var(--muted)}
.doc blockquote p{margin:.3rem 0}
.doc code{font-family:"JetBrains Mono",monospace;font-size:.88em}
.doc :not(pre)>code{background:rgba(53,191,171,.12);color:#1f8f7e;padding:.15rem .4rem;border-radius:6px}
.doc pre{background:#0a1a17;color:#c8d6d2;padding:1rem 1.2rem;border-radius:12px;overflow-x:auto;
line-height:1.7;font-size:.86rem;border:1px solid #19322d}
.doc pre code{color:inherit}
.doc table{width:100%;border-collapse:collapse;margin:1.3rem 0;font-size:.94rem;border:1px solid var(--line);
border-radius:10px;overflow:hidden;display:block;overflow-x:auto}
.doc th,.doc td{border:1px solid var(--line);padding:.55rem .85rem;text-align:left;vertical-align:top}
.doc th{background:rgba(53,191,171,.12);font-weight:600;white-space:nowrap}
.doc tr:nth-child(even) td{background:rgba(53,191,171,.035)}
.doc hr{border:none;height:1px;background:linear-gradient(90deg,transparent,var(--brand),transparent);margin:2rem 0}
.doc img{max-width:100%;border-radius:10px}
.doc input[type=checkbox]{accent-color:var(--brand);margin-right:.4rem}
.foot{text-align:center;margin-top:20px;font-family:"JetBrains Mono",monospace;font-size:11px;color:var(--muted)}
@media(max-width:640px){.doc{padding:28px 20px}}
@media print{body{background:#fff;padding:0}.topbar,.foot{display:none}
.doc{box-shadow:none;border:none;padding:0;background:#fff}}
`;

const indexCss = `
.hero{margin:10px 0 28px}
.hero h1{font-size:2rem;margin:0 0 6px}
.hero p{margin:0;color:var(--muted);font-size:14px}
.doc-list{list-style:none;margin:0;padding:0;display:grid;gap:10px}
.doc-list a{display:flex;align-items:center;justify-content:space-between;gap:12px;text-decoration:none;
padding:14px 18px;border-radius:12px;background:rgba(255,255,255,.62);border:1px solid rgba(255,255,255,.85);
box-shadow:0 4px 16px rgba(51,79,82,.06);color:var(--fg);transition:transform .2s ease,box-shadow .2s ease}
.doc-list a:hover{transform:translateY(-2px);box-shadow:0 8px 24px rgba(51,79,82,.12)}
.doc-list .t{font-size:15px}
.doc-list .arrow{color:#1f8f7e;font-family:"JetBrains Mono",monospace;font-size:12px}
.meta{color:var(--muted);font-size:12px;margin-top:18px}
`;

function template(title, body) {
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${esc(title)}</title>
<link rel="preconnect" href="https://fonts.googleapis.cn" />
<link rel="preconnect" href="https://fonts.gstatic.cn" crossorigin />
<link href="https://fonts.googleapis.cn/css2?family=Noto+Serif+SC:wght@400;600;700&family=JetBrains+Mono:wght@400;600&display=swap" rel="stylesheet" />
<style>${baseCss}</style>
</head>
<body>
<div class="page">
  <nav class="topbar"><a href="./index.html">← 返回文档索引</a><span class="badge">Markdown → HTML</span></nav>
  <article class="doc">${body}</article>
  <footer class="foot">由 render-docs.mjs 生成 · 可打印 / 导出 PDF</footer>
</div>
</body>
</html>`;
}

function indexTemplate(docs) {
  const items = docs
    .map(
      (d) =>
        `<li><a href="./${esc(d.htmlFile)}"><span class="t">${esc(d.title)}</span><span class="arrow">阅读 →</span></a></li>`,
    )
    .join("\n");
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>my-blog 文档索引</title>
<link rel="preconnect" href="https://fonts.googleapis.cn" />
<link rel="preconnect" href="https://fonts.gstatic.cn" crossorigin />
<link href="https://fonts.googleapis.cn/css2?family=Noto+Serif+SC:wght@400;600;700&family=JetBrains+Mono:wght@400;600&display=swap" rel="stylesheet" />
<style>${baseCss}${indexCss}</style>
</head>
<body>
<div class="page">
  <header class="hero">
    <h1>my-blog 文档</h1>
    <p>Markdown 已渲染为 HTML，点击标题阅读。生成的 .html 与源 .md 放在同一目录。</p>
  </header>
  <ul class="doc-list">
    ${items}
  </ul>
  <p class="meta">共 ${docs.length} 份文档 · 重新生成：<code>node scripts/render-docs.mjs "C:/Users/如玧/Desktop/my-blog搭建"</code></p>
</div>
</body>
</html>`;
}

const entries = await fs.readdir(dir, { withFileTypes: true });
const mdFiles = entries
  .filter((e) => e.isFile() && e.name.toLowerCase().endsWith(".md"))
  .map((e) => e.name)
  .sort((a, b) => a.localeCompare(b, "zh-CN"));

const docs = [];
for (const file of mdFiles) {
  const full = path.join(dir, file);
  const md = await fs.readFile(full, "utf8");
  const body = String(await parser.process(md));
  const heading = md.match(/^#\s+(.+)$/m)?.[1]?.trim();
  const title = heading || file.replace(/\.md$/i, "");
  const htmlFile = file.replace(/\.md$/i, ".html");
  await fs.writeFile(path.join(dir, htmlFile), template(title, body), "utf8");
  docs.push({ title, htmlFile });
}

await fs.writeFile(path.join(dir, "index.html"), indexTemplate(docs), "utf8");

console.log(`✓ 已生成 ${docs.length} 份 HTML 文档 + index.html`);
console.log(`目录：${dir}`);
for (const d of docs) console.log(`  - ${d.htmlFile}  (${d.title})`);
