// 一次性脚本：把品牌 SVG 渲染为 public/og.png（OpenGraph 分享图，1200x630）
// 依赖已有 node_modules/sharp（内嵌 libvips，可渲染 SVG）。用法：node scripts/generate-og.mjs
import sharp from "sharp";
import { mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const outPath = join(__dirname, "..", "public", "og.png");

const W = 1200;
const H = 630;

// 与 globals.css 品牌色保持一致
const svg = `
<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <radialGradient id="a" cx="0.85" cy="0" r="1">
      <stop offset="0" stop-color="#2a1550"/>
      <stop offset="1" stop-color="#07070f"/>
    </radialGradient>
    <radialGradient id="b" cx="0" cy="1" r="1.2">
      <stop offset="0" stop-color="#1b0b33"/>
      <stop offset="1" stop-color="#07070f"/>
    </radialGradient>
    <linearGradient id="brand" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#c4b5fd"/>
      <stop offset="0.5" stop-color="#a855f7"/>
      <stop offset="1" stop-color="#7c3aed"/>
    </linearGradient>
  </defs>

  <!-- 背景 -->
  <rect width="${W}" height="${H}" fill="#07070f"/>
  <rect width="${W}" height="${H}" fill="url(#a)"/>
  <rect width="${W}" height="${H}" fill="url(#b)"/>

  <!-- 顶部渐变细线 -->
  <rect x="0" y="0" width="${W}" height="3" fill="url(#brand)"/>

  <!-- 品牌标记 -->
  <g transform="translate(600 230)">
    <rect x="-52" y="-52" width="104" height="104" rx="24" fill="url(#brand)"/>
    <text x="0" y="22" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="56" font-weight="bold" fill="#ffffff">J</text>
  </g>

  <!-- 站点名 -->
  <text x="${W/2}" y="360" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="72" font-weight="bold" fill="url(#brand)">jianglai520</text>

  <!-- 副标题 -->
  <text x="${W/2}" y="420" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="26" fill="#9b9bb3">我的博客 · 记录与分享</text>
</svg>
`;

mkdirSync(dirname(outPath), { recursive: true });
await sharp(Buffer.from(svg)).png().toFile(outPath);
console.log("已生成 " + outPath);
