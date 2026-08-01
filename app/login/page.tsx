"use client";

import { supabase } from "@/lib/supabase";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setLoading(false);

    if (error) {
      setMessage(`❌ 登录失败：${error.message}`);
    } else {
      router.push("/admin");
    }
  }

  async function handleSignUp() {
    setLoading(true);
    setMessage("");

    const { error } = await supabase.auth.signUp({
      email,
      password,
    });

    setLoading(false);

    if (error) {
      setMessage(`❌ 注册失败：${error.message}`);
    } else {
      setMessage("✅ 注册成功，现在可以登录了！");
    }
  }

  const inputCls =
    "w-full rounded-lg border border-ink-600 bg-ink-800 px-4 py-3 text-fg placeholder:text-fg-faint focus:outline-none focus:ring-2 focus:ring-brand-500";

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-md rounded-2xl border border-ink-700/60 bg-ink-900/60 p-8 shadow-glow">
        <h1 className="mb-6 text-center text-2xl font-bold text-fg">🔐 管理员登录</h1>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label htmlFor="login-email" className="mb-1 block text-sm text-fg-muted">
              邮箱
            </label>
            <input
              id="login-email"
              name="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="你的邮箱"
              className={inputCls}
            />
          </div>

          <div>
            <label htmlFor="login-password" className="mb-1 block text-sm text-fg-muted">
              密码
            </label>
            <input
              id="login-password"
              name="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="密码"
              className={inputCls}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-gradient-to-r from-brand-600 to-brand-500 py-3 font-medium text-white transition-colors hover:from-brand-500 hover:to-glow-400 disabled:bg-ink-600"
          >
            {loading ? "登录中..." : "登录"}
          </button>

          <button
            type="button"
            onClick={handleSignUp}
            disabled={loading}
            className="w-full py-2 text-sm text-fg-faint transition-colors hover:text-brand-300"
          >
            没有账号？点此注册
          </button>

          {message && (
            <p
              className={`text-center text-sm ${
                message.includes("✅") ? "text-emerald-400" : "text-red-400"
              }`}
            >
              {message}
            </p>
          )}
        </form>

        <div className="mt-6 text-center">
          <Link href="/" className="text-sm text-fg-faint transition-colors hover:text-brand-300">
            ← 返回首页
          </Link>
        </div>
      </div>
    </div>
  );
}
