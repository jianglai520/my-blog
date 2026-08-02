import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  // 明确工作区根目录，避免 Next 因检测到多个 lockfile 而误判根目录到用户主目录
  turbopack: {
    root: path.join(__dirname, "../"),
  },
  experimental: {
    serverActions: {
      // 图片上传走 Server Action，默认 1MB 不够，放宽到 10MB（配合 uploads.ts 的 5MB 单图限制）
      bodySizeLimit: "10mb",
    },
  },
  images: {
    // 允许远程封面图来自常用图床；本地 public 下的图片无需配置
    remotePatterns: [
      { protocol: "https", hostname: "**.supabase.co" },
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "cdn.jsdelivr.net" },
    ],
  },
};

export default nextConfig;
