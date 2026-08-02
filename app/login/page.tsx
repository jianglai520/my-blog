"use client";

import { useActionState } from "react";
import Link from "next/link";
import { login, type AuthState } from "@/app/actions/auth";

const inputCls =
  "w-full rounded-lg border border-ink-600 bg-ink-800 px-4 py-3 text-fg placeholder:text-fg-faint focus:outline-none focus:ring-2 focus:ring-brand-500";

const initialState: AuthState = { message: "", success: false };

export default function LoginPage() {
  const [loginState, loginAction, loginPending] = useActionState<AuthState, FormData>(
    login,
    initialState
  );

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-md rounded-2xl border border-ink-700/60 bg-ink-900/60 p-8 shadow-glow">
        <h1 className="mb-6 text-center text-2xl font-bold text-fg">🔐 管理员登录</h1>

        {/* ===== 登录表单 ===== */}
        <form action={loginAction} className="space-y-4">
          <div>
            <label htmlFor="login-email" className="mb-1 block text-sm text-fg-muted">
              邮箱
            </label>
            <input
              id="login-email"
              name="email"
              type="email"
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
              placeholder="密码"
              className={inputCls}
            />
          </div>

          <button
            type="submit"
            disabled={loginPending}
            className="w-full rounded-lg bg-gradient-to-r from-brand-600 to-brand-500 py-3 font-medium text-white transition-colors hover:from-brand-500 hover:to-glow-400 disabled:bg-ink-600"
          >
            {loginPending ? "登录中..." : "登录"}
          </button>

          {loginState.message && (
            <p
              className={`text-center text-sm ${
                loginState.success ? "text-emerald-400" : "text-red-400"
              }`}
            >
              {loginState.message}
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
