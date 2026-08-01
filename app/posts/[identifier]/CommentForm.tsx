"use client";

import { supabase } from "@/lib/supabase";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function CommentForm({ postId }: { postId: number }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [content, setContent] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!name.trim() || !content.trim()) {
      setMessage("⚠️ 昵称和评论内容都不能为空");
      return;
    }

    setLoading(true);
    setMessage("");

    const { error } = await supabase.from("comments").insert([
      { post_id: postId, name: name.trim(), content: content.trim() },
    ]);

    setLoading(false);

    if (error) {
      setMessage("❌ 评论失败：");
    } else {
      setMessage("✅ 评论成功！");
      setName("");
      setContent("");
      setTimeout(() => router.refresh(), 500);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mt-8 rounded-2xl border border-ink-700/60 bg-ink-900/50 p-6"
    >
      <h3 className="mb-4 text-lg font-semibold text-fg">写评论</h3>

      <div className="mb-4">
        <label htmlFor="comment-name" className="mb-1 block text-sm text-fg-muted">
          昵称
        </label>
        <input
          id="comment-name"
          name="name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="你的昵称"
          className="w-full rounded-lg border border-ink-600 bg-ink-800 px-4 py-3 text-fg placeholder:text-fg-faint focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
      </div>

      <div className="mb-4">
        <label htmlFor="comment-content" className="mb-1 block text-sm text-fg-muted">
          内容
        </label>
        <textarea
          id="comment-content"
          name="content"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="写下你的评论..."
          rows={4}
          className="w-full resize-y rounded-lg border border-ink-600 bg-ink-800 px-4 py-3 text-fg placeholder:text-fg-faint focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className={`rounded-lg px-6 py-3 font-medium text-white transition-colors ${
          loading
            ? "cursor-not-allowed bg-ink-600"
            : "bg-gradient-to-r from-brand-600 to-brand-500 hover:from-brand-500 hover:to-glow-400"
        }`}
      >
        {loading ? "提交中..." : "发布评论"}
      </button>

      {message && (
        <p
          className={`mt-4 text-sm ${
            message.includes("✅") ? "text-emerald-400" : "text-red-400"
          }`}
        >
          {message}
        </p>
      )}
    </form>
  );
}
