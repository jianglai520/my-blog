"use server";

import { redirect } from "next/navigation";
import { getServerSupabase } from "@/lib/server/supabase";
import { credentialsSchema } from "@/lib/validations/auth";

export type AuthState = {
  message: string;
  success: boolean;
};

/** 从表单提取并校验凭据 */
function parseCredentials(formData: FormData):
  | { ok: true; data: { email: string; password: string } }
  | { ok: false; message: string } {
  const parsed = credentialsSchema.safeParse({
    email: String(formData.get("email") || ""),
    password: String(formData.get("password") || ""),
  });
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return { ok: false, message: `❌ ${first?.message || "输入不合法"}` };
  }
  return { ok: true, data: parsed.data };
}

/** 登录：服务端校验凭据 → 同步 profiles → 跳转后台 */
export async function login(
  _prev: AuthState,
  formData: FormData
): Promise<AuthState> {
  const parsed = parseCredentials(formData);
  if (!parsed.ok) return { message: parsed.message, success: false };

  const supabase = await getServerSupabase();
  const { data, error } = await supabase.auth.signInWithPassword(parsed.data);

  if (error) {
    return { message: `❌ 登录失败：${error.message}`, success: false };
  }

  // 确保 profiles 行存在（RPC 只能建 is_admin=false 的行，绝不覆盖博主标记）
  if (data.user) {
    const { error: rpcError } = await supabase.rpc("ensure_profile");
    // 依赖 0004 迁移的 ensure_profile 函数；失败仅记录不影响登录
    if (rpcError) {
      console.warn("[auth] ensure_profile skipped:", rpcError.message);
    }
  }

  redirect("/admin");
}

/** 注册：创建账号后提示去登录（是否允许注册由 Supabase 控制台控制） */
export async function signup(
  _prev: AuthState,
  formData: FormData
): Promise<AuthState> {
  const parsed = parseCredentials(formData);
  if (!parsed.ok) return { message: parsed.message, success: false };

  const supabase = await getServerSupabase();
  const { error } = await supabase.auth.signUp(parsed.data);

  if (error) {
    return { message: `❌ 注册失败：${error.message}`, success: false };
  }

  return { message: "✅ 注册成功，现在可以登录了！", success: true };
}

/** 退出登录 */
export async function logout() {
  const supabase = await getServerSupabase();
  await supabase.auth.signOut();
  redirect("/login");
}
