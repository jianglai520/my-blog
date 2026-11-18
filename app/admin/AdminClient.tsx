"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { logout } from "@/app/actions/auth";
import { getPostContent } from "@/app/actions/posts";
import PostForm from "./PostForm";
import PostList from "./PostList";
import CommentManager from "./CommentManager";
import GuestbookManager from "./GuestbookManager";
import MessageManager from "./MessageManager";
import ProjectManager from "./ProjectManager";
import SkillManager from "./SkillManager";
import SettingsForm from "./SettingsForm";
import type { AdminPost } from "./shared";
import type { SiteSettings } from "@/lib/site";
import type { Comment } from "@/lib/posts";
import type { GuestbookMessage, Message } from "@/db/schema";
import { formatBytes } from "@/lib/format";

export type AdminTab = "posts" | "comments" | "projects" | "skills" | "settings";

const TABS: { key: AdminTab; label: string; countKey?: keyof AdminCounts }[] = [
  { key: "posts", label: "📝 文章管理", countKey: "posts" },
  { key: "comments", label: "💬 评论管理", countKey: "comments" },
  { key: "projects", label: "📁 项目管理" },
  { key: "skills", label: "🏷️ 技能管理" },
  { key: "settings", label: "⚙️ 站点设置" },
];

export type AdminCounts = {
  posts: number;
  comments: number;
  guestbook: number;
  messages: number;
};

/**
 * 后台主界面：顶部导航 + Tab（URL 驱动，按需加载）+ 组合各管理模块。
 * 文章列表只接收元数据；编辑时通过 Server Action 按需取正文。
 */
export default function AdminClient({
  userEmail,
  posts,
  comments,
  guestbookMessages,
  messages,
  siteSettings,
  storageUsage,
  tab,
  counts,
}: {
  userEmail: string;
  posts: AdminPost[];
  comments: Comment[];
  guestbookMessages: GuestbookMessage[];
  messages: Message[];
  siteSettings: SiteSettings;
  storageUsage: { files: number; bytes: number };
  tab: AdminTab;
  counts: AdminCounts;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState<AdminPost | null>(null);
  const [formVersion, setFormVersion] = useState(0);
  const [editLoadingId, setEditLoadingId] = useState<number | null>(null);

  // 保存成功：退出编辑模式 + 递增 key 重置表单 + 刷新列表
  function handleSaved() {
    setEditing(null);
    setFormVersion((v) => v + 1);
    router.refresh();
  }

  // 列表只有元数据，点击编辑时再拉正文
  async function handleEdit(post: AdminPost) {
    setEditLoadingId(post.id);
    try {
      const content = await getPostContent(post.id);
      if (content == null) return;
      setEditing({ ...post, content });
      requestAnimationFrame(() => {
        document
          .getElementById("post-form")
          ?.scrollIntoView({ behavior: "smooth" });
      });
    } finally {
      setEditLoadingId(null);
    }
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
          <p className="mt-1 font-mono text-xs text-fg-faint">
            存储：{storageUsage.files} 个文件 · {formatBytes(storageUsage.bytes)}
          </p>
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

      {/* Tab 切换（URL 驱动：只加载当前 Tab 的数据） */}
      <div className="mb-6 flex flex-wrap gap-2 border-b border-ink-700/60">
        {TABS.map((item) => {
          const active = tab === item.key;
          const count = item.countKey ? counts[item.countKey] : undefined;
          return (
            <Link
              key={item.key}
              href={`/admin?tab=${item.key}`}
              scroll={false}
              aria-current={active ? "page" : undefined}
              className={`rounded-t-lg px-4 py-2 text-sm transition-colors ${
                active
                  ? "border-b-2 border-brand-500 text-fg"
                  : "text-fg-muted hover:text-fg"
              }`}
            >
              {item.label}
              {count != null ? `（${count}）` : ""}
            </Link>
          );
        })}
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

          {/* 文章管理列表（仅元数据） */}
          <div className="rounded-2xl border border-ink-700/60 bg-ink-900/50 p-8">
            <h2 className="mb-6 text-xl font-bold text-fg">
              📋 文章管理{" "}
              <span className="text-sm font-normal text-fg-faint">
                （{posts.length} 篇，含草稿）
              </span>
            </h2>
            <PostList
              posts={posts}
              onEdit={handleEdit}
              loadingId={editLoadingId}
            />
          </div>
        </>
      ) : tab === "comments" ? (
        /* 评论管理（仅进入此 Tab 时由服务端加载） */
        <div className="rounded-2xl border border-ink-700/60 bg-ink-900/50 p-8">
          <h2 className="mb-6 text-xl font-bold text-fg">
            💬 评论管理{" "}
            <span className="text-sm font-normal text-fg-faint">（最新 200 条）</span>
          </h2>
          <CommentManager comments={comments} posts={posts} />

          {/* 留言板留言 */}
          <h2 className="mb-6 mt-10 text-xl font-bold text-fg">
            📝 留言板留言{" "}
            <span className="text-sm font-normal text-fg-faint">
              （最新 {guestbookMessages.length} 条）
            </span>
          </h2>
          <GuestbookManager messages={guestbookMessages} />

          {/* 站内私信（含联系方式，仅博主可见） */}
          <h2 className="mb-6 mt-10 text-xl font-bold text-fg">
            ✉️ 站内私信{" "}
            <span className="text-sm font-normal text-fg-faint">
              （最新 {messages.length} 条，含联系方式）
            </span>
          </h2>
          <MessageManager messages={messages} />
        </div>
      ) : tab === "projects" ? (
        /* 项目管理 */
        <div className="rounded-2xl border border-ink-700/60 bg-ink-900/50 p-8">
          <h2 className="mb-6 text-xl font-bold text-fg">
            📁 项目管理{" "}
            <span className="text-sm font-normal text-fg-faint">
              （展示在 /projects 页）
            </span>
          </h2>
          <ProjectManager initialData={siteSettings.projects} />
        </div>
      ) : tab === "skills" ? (
        /* 技能管理 */
        <div className="rounded-2xl border border-ink-700/60 bg-ink-900/50 p-8">
          <h2 className="mb-6 text-xl font-bold text-fg">
            🏷️ 技能管理{" "}
            <span className="text-sm font-normal text-fg-faint">
              （展示在 /skills 页）
            </span>
          </h2>
          <SkillManager initialData={siteSettings.skills} />
        </div>
      ) : (
        <SettingsForm settings={siteSettings} />
      )}
    </div>
  );
}
