"use client";

import { supabase } from "@/lib/supabase";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { slugify } from "@/lib/format";

// 文章数据类型
type Post = {
  id: number;
  slug: string | null;
  title: string;
  content: string;
  cover_image: string | null;
  created_at: string;
  published: boolean;
};

const inputCls =
  "w-full rounded-lg border border-ink-600 bg-ink-800 px-4 py-3 text-fg placeholder:text-fg-faint focus:outline-none focus:ring-2 focus:ring-brand-500";

export default function AdminPage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [excerpt, setExcerpt] = useState("");
  const [coverImage, setCoverImage] = useState("");
  const [content, setContent] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [posts, setPosts] = useState<Post[]>([]);
  const [userEmail, setUserEmail] = useState("");

  // 页面加载时检查是否已登录，并获取文章列表
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        router.push("/login");
      } else {
        setUserEmail(session.user.email || "");
        setChecking(false);
        fetchPosts();
      }
    });
  }, [router]);

  // 从数据库读取所有文章
  async function fetchPosts() {
    const { data } = await supabase
      .from("posts")
      .select("id,slug,title,content,cover_image,created_at,published")
      .order("created_at", { ascending: false });

    if (data) setPosts(data as Post[]);
  }

  // 退出登录
  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  // 标题变化时自动生成 slug 建议（若用户还没手动改过）
  function handleTitleChange(value: string) {
    setTitle(value);
    if (!slug) setSlug(slugify(value));
  }

  // 发布文章
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!title.trim() || !content.trim()) {
      setMessage("⚠️ 标题和内容都不能为空");
      return;
    }

    setLoading(true);
    setMessage("");

    const { error } = await supabase.from("posts").insert([
      {
        title: title.trim(),
        slug: slug.trim() || null,
        excerpt: excerpt.trim() || null,
        cover_image: coverImage.trim() || null,
        content: content.trim(),
        published: true,
      },
    ]);

    setLoading(false);

    if (error) {
      setMessage(`❌ 发布失败：${error.message}`);
    } else {
      setMessage("✅ 发布成功！");
      setTitle("");
      setSlug("");
      setExcerpt("");
      setCoverImage("");
      setContent("");
      fetchPosts();
    }
  }

  // 删除文章
  async function handleDelete(postId: number) {
    if (!confirm("确定要删除这篇文章吗？")) return;

    const { error } = await supabase.from("posts").delete().eq("id", postId);

    if (error) {
      alert(`❌ 删除失败：${error.message}`);
    } else {
      alert("✅ 删除成功！");
      fetchPosts();
    }
  }

  // 检查登录中，显示加载
  if (checking) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-fg-muted">检查登录状态...</p>
      </div>
    );
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
        <button
          onClick={handleLogout}
          className="text-sm text-red-400 transition-colors hover:text-red-300"
        >
          退出登录
        </button>
      </div>

      {/* ===== 发布文章表单 ===== */}
      <div className="mb-8 rounded-2xl border border-ink-700/60 bg-ink-900/50 p-8">
        <h2 className="mb-6 text-xl font-bold text-fg">📝 写新文章</h2>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label htmlFor="post-title" className="mb-2 block text-sm text-fg-muted">
              文章标题
            </label>
            <input
              id="post-title"
              type="text"
              value={title}
              onChange={(e) => handleTitleChange(e.target.value)}
              placeholder="给文章起个标题..."
              className={inputCls}
            />
          </div>

          <div>
            <label htmlFor="post-slug" className="mb-2 block text-sm text-fg-muted">
              语义化链接（slug，可选）<span className="text-fg-faint">· 留空则用 id</span>
            </label>
            <input
              id="post-slug"
              type="text"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              placeholder="my-first-post（建议：由标题自动生成）"
              className={inputCls}
            />
          </div>

          <div>
            <label htmlFor="post-excerpt" className="mb-2 block text-sm text-fg-muted">
              摘要（excerpt，可选）
            </label>
            <input
              id="post-excerpt"
              type="text"
              value={excerpt}
              onChange={(e) => setExcerpt(e.target.value)}
              placeholder="列表卡片与分享卡片显示的摘要"
              className={inputCls}
            />
          </div>

          <div>
            <label htmlFor="post-cover" className="mb-2 block text-sm text-fg-muted">
              封面图 URL（可选）
            </label>
            <input
              id="post-cover"
              type="text"
              value={coverImage}
              onChange={(e) => setCoverImage(e.target.value)}
              placeholder="https://.../cover.jpg（需在 next.config.ts 允许的图源）"
              className={inputCls}
            />
          </div>

          <div>
            <label htmlFor="post-content" className="mb-2 block text-sm text-fg-muted">
              文章内容
            </label>
            <textarea
              id="post-content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="开始写文章吧...（每行一个自然段）"
              rows={10}
              className={`${inputCls} resize-y`}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className={`w-full rounded-lg px-6 py-3 text-lg font-medium text-white transition-colors ${
              loading
                ? "cursor-not-allowed bg-ink-600"
                : "bg-gradient-to-r from-brand-600 to-brand-500 hover:from-brand-500 hover:to-glow-400"
            }`}
          >
            {loading ? "发布中..." : "📝 发布文章"}
          </button>

          {message && (
            <p
              className={`text-center ${
                message.includes("✅") ? "text-emerald-400" : "text-red-400"
              }`}
            >
              {message}
            </p>
          )}
        </form>
      </div>

      {/* ===== 文章管理列表 ===== */}
      <div className="rounded-2xl border border-ink-700/60 bg-ink-900/50 p-8">
        <h2 className="mb-6 text-xl font-bold text-fg">📋 文章管理</h2>

        {posts.length === 0 ? (
          <p className="py-8 text-center text-fg-muted">还没有文章～</p>
        ) : (
          <div className="space-y-4">
            {posts.map((post) => (
              <div
                key={post.id}
                className="flex items-center justify-between rounded-lg border border-ink-700/60 bg-ink-800/40 p-4 transition-colors hover:bg-ink-800"
              >
                <div className="min-w-0 flex-1">
                  <a
                    href={`/posts/${post.slug ?? post.id}`}
                    className="block truncate text-lg font-medium text-fg transition-colors hover:text-brand-300"
                  >
                    {post.title}
                  </a>
                  <p className="mt-1 text-sm text-fg-faint">
                    {post.slug ? `/posts/${post.slug}` : `/posts/${post.id}`}
                    {" · "}
                    {new Date(post.created_at).toLocaleDateString("zh-CN")}
                  </p>
                </div>
                <button
                  onClick={() => handleDelete(post.id)}
                  className="ml-4 flex-shrink-0 rounded-lg border border-red-400/30 px-4 py-2 text-sm text-red-400 transition-colors hover:bg-red-400/10"
                >
                  删除
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
