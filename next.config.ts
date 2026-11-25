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
    // 限制构建 worker 数：静态页会并发查库，worker 太多会打满 Supabase 连接池
    cpus: 4,
  },
  images: {
    /**
     * Hobby 计划的 Image Optimization 额度是 5K/月，本项目已用满（5K/5K）。
     * 额度用尽后，任何未缓存的图片变换都会返回 402，表现为封面图空白。
     *
     * 这里关闭 Vercel 图片优化：next/image 直接输出 Supabase 原图 URL，
     * 不再消耗 Transformations / Cache Writes 额度。
     * 若以后升级到 Pro 或改为自托管 + sharp，可删除 unoptimized 重新启用。
     */
    unoptimized: true,
    // 以下配置仅在重新开启优化时生效，保留以便日后恢复
    formats: ["image/avif", "image/webp"],
    remotePatterns: [
      { protocol: "https", hostname: "**.supabase.co" },
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "cdn.jsdelivr.net" },
    ],
  },
  // 基础安全响应头（CSP 需要 nonce，后续单独以 Report-Only 方式引入）
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "DENY" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
