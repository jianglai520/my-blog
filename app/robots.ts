import type { MetadataRoute } from "next";

const SITE_URL = "https://jianglai520.com";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        // 通用爬虫（含搜索引擎）
        userAgent: "*",
        allow: "/",
        disallow: ["/admin", "/login", "/api/"],
      },
      {
        // OpenAI 爬虫：允许抓取（全站公开内容）
        userAgent: "GPTBot",
        allow: "/",
      },
      {
        // Anthropic 爬虫：允许抓取
        userAgent: "ClaudeBot",
        allow: "/",
      },
      {
        // Google AI 训练爬虫
        userAgent: "Google-Extended",
        allow: "/",
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}

