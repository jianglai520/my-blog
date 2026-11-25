// 批量压缩 Supabase Storage 里的图片（默认 dry-run，不修改线上）
// 用法：
//   node scripts/optimize-storage-images.mjs            # 只报告，不写入
//   node scripts/optimize-storage-images.mjs --apply    # 备份原图后覆盖上传
//
// 策略：最长边 ≤ 1600px，保持原格式与文件路径（URL 不变）
// - JPEG: quality 80 + mozjpeg
// - PNG : compressionLevel 9（无损）
// - WebP: quality 82
// - GIF : 跳过（保留动图）
// 收益不足 10% 的文件不动。

import { createClient } from "@supabase/supabase-js";
import sharp from "sharp";
import { readFileSync, mkdirSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";

const APPLY = process.argv.includes("--apply");
const BUCKET = "post-images";
const MAX_DIM = 1600;
const MIN_SAVING_RATIO = 0.1; // 至少省 10% 才替换

// ---------- 读取 .env.local ----------
const env = readFileSync(new URL("../.env.local", import.meta.url), "utf8");
const pick = (key) => env.match(new RegExp(`^${key}=(.*)$`, "m"))?.[1]?.trim() ?? "";

const url = pick("NEXT_PUBLIC_SUPABASE_URL");
const anonKey = pick("NEXT_PUBLIC_SUPABASE_ANON_KEY");
const email = pick("TEST_EMAIL");
const password = pick("TEST_PASSWORD");

if (!url || !anonKey || !email || !password) {
  console.error("❌ 缺少 NEXT_PUBLIC_SUPABASE_URL / ANON_KEY / TEST_EMAIL / TEST_PASSWORD");
  process.exit(1);
}

const supabase = createClient(url, anonKey);

// ---------- 登录（博主身份，才有 Storage 写权限） ----------
const { error: loginError } = await supabase.auth.signInWithPassword({ email, password });
if (loginError) {
  console.error("❌ 登录失败:", loginError.message);
  process.exit(1);
}
console.log(`已登录：${email}${APPLY ? "（APPLY 模式，会覆盖文件）" : "（dry-run，不写入）"}`);

// ---------- 递归列出 bucket 内所有对象 ----------
async function walk(prefix = "") {
  const files = [];
  let offset = 0;

  for (;;) {
    const { data, error } = await supabase.storage
      .from(BUCKET)
      .list(prefix, { limit: 1000, offset });
    if (error) throw new Error(`列出 ${prefix || "/"} 失败: ${error.message}`);
    if (!data?.length) break;

    for (const item of data) {
      const path = prefix ? `${prefix}/${item.name}` : item.name;
      if (item.id === null) {
        files.push(...(await walk(path))); // 目录
      } else {
        files.push({ path, size: Number(item.metadata?.size ?? 0) });
      }
    }

    if (data.length < 1000) break;
    offset += data.length;
  }
  return files;
}

const IMAGE_RE = /\.(jpe?g|png|webp|gif)$/i;

function formatBytes(bytes) {
  if (bytes >= 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(2)}MB`;
  return `${(bytes / 1024).toFixed(0)}KB`;
}

// ---------- 压缩单张 ----------
async function optimize(buffer, path) {
  const ext = path.split(".").pop().toLowerCase();
  if (ext === "gif") return { skip: "GIF 跳过" };

  const meta = await sharp(buffer).metadata();
  const pipeline = sharp(buffer).rotate().resize({
    width: MAX_DIM,
    height: MAX_DIM,
    fit: "inside",
    withoutEnlargement: true,
  });

  let out;
  let contentType;
  if (ext === "jpg" || ext === "jpeg") {
    out = await pipeline.jpeg({ quality: 80, mozjpeg: true }).toBuffer();
    contentType = "image/jpeg";
  } else if (ext === "png") {
    out = await pipeline.png({ compressionLevel: 9, adaptiveFiltering: true }).toBuffer();
    contentType = "image/png";
  } else if (ext === "webp") {
    out = await pipeline.webp({ quality: 82 }).toBuffer();
    contentType = "image/webp";
  } else {
    return { skip: "未知格式" };
  }

  const saved = buffer.length - out.length;
  if (saved / buffer.length < MIN_SAVING_RATIO) {
    return {
      skip: `收益不足 ${Math.round(MIN_SAVING_RATIO * 100)}%`,
      newSize: out.length,
      dimensions: `${meta.width}×${meta.height}`,
    };
  }

  return {
    out,
    contentType,
    newSize: out.length,
    dimensions: `${meta.width}×${meta.height}`,
    newDimensions: await sharp(out).metadata().then((m) => `${m.width}×${m.height}`),
  };
}

// ---------- 主流程 ----------
console.log("扫描 bucket…");
const all = await walk();
const images = all.filter((f) => IMAGE_RE.test(f.path));
console.log(`共 ${all.length} 个对象，其中图片 ${images.length} 张\n`);

let originalTotal = 0;
let newTotal = 0;
let changed = 0;
let skipped = 0;
const results = [];

for (const [index, file] of images.entries()) {
  const tag = `[${index + 1}/${images.length}] ${file.path}`;
  try {
    const { data, error } = await supabase.storage.from(BUCKET).download(file.path);
    if (error || !data) throw new Error(error?.message ?? "下载失败");

    const buffer = Buffer.from(await data.arrayBuffer());
    const result = await optimize(buffer, file.path);

    if (result.skip) {
      skipped++;
      console.log(`${tag}  ${formatBytes(buffer.length)}  跳过：${result.skip}`);
      continue;
    }

    originalTotal += buffer.length;
    newTotal += result.newSize;
    changed++;

    const ratio = ((1 - result.newSize / buffer.length) * 100).toFixed(0);
    console.log(
      `${tag}  ${formatBytes(buffer.length)} → ${formatBytes(result.newSize)}  省 ${ratio}%  (${result.dimensions} → ${result.newDimensions})`
    );

    results.push({ path: file.path, before: buffer.length, after: result.newSize });

    if (APPLY) {
      // 1) 本地备份原图（backups/ 已在 .gitignore）
      const backupPath = join("backups", "images-original", file.path);
      mkdirSync(dirname(backupPath), { recursive: true });
      // 备份只写一次：避免重复执行时用「已压缩版本」覆盖原始备份
      if (!existsSync(backupPath)) writeFileSync(backupPath, buffer);

      // 2) 覆盖上传（路径不变，URL 不变）
      const { error: uploadError } = await supabase.storage
        .from(BUCKET)
        .upload(file.path, result.out, {
          contentType: result.contentType,
          upsert: true,
          cacheControl: "3600",
        });
      if (uploadError) throw new Error(`上传失败: ${uploadError.message}`);
    }
  } catch (error) {
    skipped++;
    console.error(`${tag}  ❌ ${error.message}`);
  }
}

// ---------- 汇总 ----------
console.log("\n================ 汇总 ================");
console.log(`可优化图片：${changed} 张`);
console.log(`跳过：${skipped} 张`);
console.log(`压缩前：${formatBytes(originalTotal)}`);
console.log(`压缩后：${formatBytes(newTotal)}`);
if (originalTotal > 0) {
  console.log(`预计节省：${formatBytes(originalTotal - newTotal)}（${((1 - newTotal / originalTotal) * 100).toFixed(1)}%）`);
}
console.log(`模式：${APPLY ? "APPLY（已写入，原图备份在 backups/images-original/）" : "dry-run（未修改任何文件）"}`);
