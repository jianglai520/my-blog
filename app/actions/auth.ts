"use server";

import { redirect } from "next/navigation";
import { getServerSupabase } from "@/lib/server/supabase";

export type AuthState = {
  message: string;
  success: boolean;
};

/** 登录：服务端校验凭据，成功后跳转后台 */
export async function login(
  _prev: AuthState,
  formData: FormData
): Promise<AuthState> {
  const email = String(formData.get("email") || "").trim();
  const password = String(formData.get("password") || "");

  if (!email || !password) {
    return { message: "邮箱和密码不能为空", success: false };
  }

  const supabase = await getServerSupabase();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return { message: `登录失败：${error.message}`, success: false };
  }

  redirect("/admin");
}

/** 注册：创建账号后提示去登录（是否允许注册由 Supabase 控制台控制） */
export async function signup(
  _prev: AuthState,
  formData: FormData
): Promise<AuthState> {
  const email = String(formData.get("email") || "").trim();
  const password = String(formData.get("password") || "");

  if (!email || !password) {
    return { message: "邮箱和密码不能为空", success: false };
  }
  if (password.length < 6) {
    return { message: "密码至少需要 6 位", success: false };
  }

  const supabase = await getServerSupabase();
  const { error } = await supabase.auth.signUp({ email, password });

  if (error) {
    return { message: `注册失败：${error.message}`, success: false };
  }

  return { message: "✅ 注册成功，现在可以登录了！", success: true };
}

/** 退出登录 */
export async function logout() {
  const supabase = await getServerSupabase();
  await supabase.auth.signOut();
  redirect("/login");
}
