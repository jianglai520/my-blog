import type { Metadata, Viewport } from "next";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { ThemeProvider } from "next-themes";
import "./globals.css";
import SiteHeader from "./components/SiteHeader";
import SiteFooter from "./components/SiteFooter";
import BackToTop from "./components/BackToTop";
import VisitTracker from "./components/VisitTracker";

const SITE_URL = "https://jianglai520.com";
const FONT_CSS_URL =
  "https://fonts.googleapis.cn/css2?family=Noto+Sans+SC:wght@400;500;700&family=Noto+Serif+SC:wght@400;600&family=Outfit:wght@400;600;700&family=JetBrains+Mono:wght@400;600&family=Ma+Shan+Zheng&display=swap";

/**
 * 字体 CSS 异步加载：等页面 load 之后再插入，避免外部字体请求拖住 load 事件。
 * Google Fonts 的中文分片 CSS 约 180KB，网络差时单次请求可达 6–7 秒；
 * 页面先用系统字体渲染，字体就绪后再替换。
 */
const FONT_LOADER = `(function(){function add(){var l=document.createElement('link');l.rel='stylesheet';l.media='print';l.href=${JSON.stringify(
  FONT_CSS_URL,
)};l.onload=function(){l.media='all'};document.head.appendChild(l);}function schedule(){setTimeout(add,800);}if(document.readyState==='complete'){schedule()}else{window.addEventListener('load',schedule,{once:true})}})();`;

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    template: "%s | jianglai520",
    default: "jianglai520 — 我的博客",
  },
  description: "个人技术博客，记录开发经验、学习笔记与生活随想。",
  openGraph: {
    siteName: "jianglai520",
    type: "website",
    locale: "zh_CN",
    images: [{ url: "/og.png", width: 1200, height: 630, alt: "jianglai520" }],
  },
  icons: {
    icon: "/favicon.ico",
  },
  alternates: {
    types: {
      "application/rss+xml": `${SITE_URL}/feed.xml`,
    },
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#eeeeee" },
    { media: "(prefers-color-scheme: dark)", color: "#07110f" },
  ],
  colorScheme: "light dark",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // 站点级结构化数据（WebSite + Person），供搜索引擎/AI 理解
  const siteJsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        name: "jianglai520 — 我的博客",
        url: SITE_URL,
        description: "个人技术博客，记录开发经验、学习笔记与生活随想。",
        inLanguage: "zh-CN",
      },
      {
        "@type": "Person",
        name: "江来",
        url: SITE_URL,
      },
    ],
  };

  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <head>
        {/* 运行时字体（fonts.googleapis.cn 镜像）：不走 next/font，避免构建期拉取失败 */}
        <link rel="preconnect" href="https://fonts.googleapis.cn" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.cn"
          crossOrigin="anonymous"
        />
        {/* 字体异步加载，不阻塞渲染；无 JS 时回退到系统字体 */}
        <script dangerouslySetInnerHTML={{ __html: FONT_LOADER }} />
        <noscript>
          <link href={FONT_CSS_URL} rel="stylesheet" />
        </noscript>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(siteJsonLd).replace(/</g, "\\u003c"),
          }}
        />
      </head>
      <body className="min-h-screen antialiased">
        <ThemeProvider attribute="data-theme" defaultTheme="system" enableSystem>
          <SiteHeader />
          <div className="flex min-h-[calc(100vh-4rem)] flex-col">
            <main className="flex-1">{children}</main>
            <SiteFooter />
          </div>
          <BackToTop />
        </ThemeProvider>
        <Analytics />
        <SpeedInsights />
        <VisitTracker />
      </body>
    </html>
  );
}
