"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { logout } from "@/app/actions/auth";
import PostForm from "./PostForm";
import PostList from "./PostList";
import CommentManager from "./CommentManager";
import GuestbookManager from "./GuestbookManager";
import SettingsForm from "./SettingsForm";
import type { AdminPost } from "./shared";
import type { SiteSettings } from "@/lib/site";
import type { Comment } from "@/lib/posts";
import type { GuestbookMessage } from "@/db/schema";

/**
 * 后台主界面：顶部导航 + Tab 切换 + 组合各管理模块。
 * 子模块拆分为 PostForm / PostList / CommentManager / GuestbookManager / SettingsForm。
 */
export default function AdminClient({
  userEmail,
  posts,
  comments,
  guestbookMessages,
  siteSettings,
}: {
  userEmail: string;
  posts: AdminPost[];
  comments: Comment[];
  guestbookMessages: GuestbookMessage[];
  siteSettings: SiteSettings;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState<AdminPost | null>(null);
  const [formVersion, setFormVersion] = useState(0);
  const [tab, setTab] = useState<"posts" | "comments" | "settings">("posts");

  // 保存成功：退出编辑模式 + 递增 key 重置表单 + 刷新列表
  function handleSaved() {
    setEditing(null);
    setFormVersion((v) => v + 1);
    router.refresh();
  }

  function handleEdit(post: AdminPost) {
    setEditing(post);
    document.getElementById("post-form")?.scrollIntoView({ behavior: "smooth" });
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-12">
      {/* 顶部导航 */}
      <div className="mb-8 flex justify-between items-center">
        <div>
          <Link href="/" className="text-sm text-fg-muted transition-colors hover:text-brand-300">
            ← 返回首页
          </Link>
          <h1 className="mt-2 text-3xl font-bold text-fg">后台管理</h1>
          <p className="mt-1 text-sm text-fg-faint">当前登录：{userEmail}</p>
        </div>
        <form action={logout}>
          <button
            type="submit"
            className="text-sm text-red-400 transition-colors hover:text-red-300"
          >
            退出登录
          </button>
        </form>
      </div>

      {/* Tab 切换 */}
      <div className="mb-6 flex gap-2 border-b border-ink-700/60">
        <button
          onClick={() => setTab("posts")}
          className={`rounded-t-lg px-4 py-2 text-sm transition-colors ${
            tab === "posts"
              ? "border-b-2 border-brand-500 text-fg"
              : "text-fg-muted hover:text-fg"
          }`}
        >
          📝 文章管理（{posts.length}）
        </button>
        <button
          onClick={() => setTab("comments")}
          className={`rounded-t-lg px-4 py-2 text-sm transition-colors ${
            tab === "comments"
              ? "border-b-2 border-brand-500 text-fg"
              : "text-fg-muted hover:text-fg"
          }`}
        >
          💬 评论管理（{comments.length}）
        </button>
        <button
          onClick={() => setTab("settings")}
          className={`rounded-t-lg px-4 py-2 text-sm transition-colors ${
            tab === "settings"
              ? "border-b-2 border-brand-500 text-fg"
              : "text-fg-muted hover:text-fg"
          }`}
        >
          ⚙️ 站点设置
        </button>
      </div>

      {tab === "posts" ? (
        <>
          {/* 写作 / 编辑表单（key 变化时重挂载重置） */}
          <PostForm
            key={`${editing?.id ?? "new"}-${formVersion}`}
            initial={editing}
            onSaved={handleSaved}
          />

          {editing && (
            <button
              onClick={() => setEditing(null)}
              className="mb-4 text-sm text-fg-faint transition-colors hover:text-brand-300"
            >
              ← 取消编辑
            </button>
          )}

          {/* 文章管理列表 */}
          <div className="rounded-2xl border border-ink-700/60 bg-ink-900/50 p-8">
            <h2 className="mb-6 text-xl font-bold text-fg">
              📋 文章管理{" "}
              <span className="text-sm font-normal text-fg-faint">
                （{posts.length} 篇，含草稿）
              </span>
            </h2>
            <PostList posts={posts} onEdit={handleEdit} />
          </div>
        </>
      ) : tab === "comments" ? (
        /* 评论管理 */
        <div className="rounded-2xl border border-ink-700/60 bg-ink-900/50 p-8">
          <h2 className="mb-6 text-xl font-bold text-fg">
            💬 评论管理{" "}
            <span className="text-sm font-normal text-fg-faint">（最新 200 条）</span>
          </h2>
          <CommentManager comments={comments} posts={posts} />

          {/* 留言板留言 */}
          <h2 className="mb-6 mt-10 text-xl font-bold text-fg">
            📝 留言板留言{" "}
            <span className="text-sm font-normal text-fg-faint">（最新 {guestbookMessages.length} 条）</span>
          </h2>
          <GuestbookManager messages={guestbookMessages} />
        </div>
      ) : (
        <SettingsForm settings={siteSettings} />
      )}
    </div>
  );
}
