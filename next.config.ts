import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  // 明确工作区根目录，避免 Next 因检测到多个 lockfile 而误判根目录到用户主目录
  turbopack: {
    root: path.join(__dirname, "../"),
  },
  experimental: {
    serverActions: {
      // 图片已改为浏览器直传 Supabase Storage（lib/browser/upload.ts），不走 Server Action。
      // 这里放宽到 10MB 主要给文章正文 / 附件等其他 action 留余量。
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
  /**
   * 安全响应头。
   *
   * CSP 目前用 `Content-Security-Policy-Report-Only`：只上报不拦截，
   * 先在真实流量里观察违规（浏览器控制台会打印 violated-directive），
   * 确认无遗漏（Vercel Analytics、Supabase、KaTeX 字体等）后再切换成强制模式。
   * 切换前不要直接改 key，否则一旦漏配白名单会导致整站脚本被阻断。
   */
  async headers() {
    const csp = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://va.vercel-scripts.com https://*.vercel-scripts.com",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.cn https://fonts.gstatic.cn",
      "font-src 'self' data: https://fonts.gstatic.cn https://fonts.gstatic.com",
      "img-src 'self' data: blob: https://*.supabase.co https://images.unsplash.com https://cdn.jsdelivr.net",
      "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://fonts.googleapis.cn https://fonts.gstatic.cn https://va.vercel-scripts.com https://vitals.vercel-insights.com",
      "media-src 'self' https://*.supabase.co",
      "object-src 'none'",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join("; ");

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
          { key: "Content-Security-Policy-Report-Only", value: csp },
        ],
      },
    ];
  },
};

export default nextConfig;
