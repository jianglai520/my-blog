import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  // 明确工作区根目录，避免 Next 因检测到多个 lockfile 而误判根目录到用户主目录
  turbopack: {
    root: path.join(__dirname, "../"),
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
