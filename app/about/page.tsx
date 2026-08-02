import type { Metadata } from "next";
import Link from "next/link";
import { getPublishedPosts } from "@/lib/posts";

export const metadata: Metadata = { title: "关于" };

export default async function AboutPage() {
  const { total } = await getPublishedPosts(1, 1);

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <Link href="/" className="mb-6 inline-block text-sm text-fg-muted transition-colors hover:text-brand-300">
        ← 返回首页
      </Link>
      <h1 className="mb-8 text-3xl font-bold text-fg">关于我</h1>

      <div className="space-y-6 rounded-2xl border border-ink-700/60 bg-ink-900/50 p-8">
        <div className="flex items-center gap-4">
          {/* TODO: 替换为你的真实头像，放 public/avatar.png */}
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-glow-500 font-display text-3xl font-bold text-white shadow-glow">
            航
          </div>
          <div>
            <p className="text-xl font-semibold text-fg">航酱</p>
            <p className="text-sm text-fg-faint">全栈学习者 & 生活记录者</p>
          </div>
        </div>

        {/* TODO: 填写你的个人介绍 */}
        <div className="text-fg-muted leading-relaxed">
          <p>
            你好，欢迎来到我的博客。这里记录我的技术实践、学习笔记与生活随想。
          </p>
        </div>

        <ul className="space-y-2 text-sm text-fg-muted">
          <li>📝 已发布文章：{total} 篇</li>
          {/* TODO: 填写你的社交链接 */}
          <li>🐙 GitHub：<span className="text-fg-faint">（待补充）</span></li>
          <li>✉️ 邮箱：<span className="text-fg-faint">（待补充）</span></li>
        </ul>
      </div>
    </div>
  );
}
