import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * 服务端 Supabase 客户端（cookie session）。
 * 仅供 Server Components / Server Actions / Route Handlers 使用；
 * 客户端组件禁止 import 本模块（server-only 会直接报构建错误）。
 */
export async function getServerSupabase() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // 在 Server Component 中调用 setAll 会抛错（无法写 cookie），
            // 可安全忽略：session cookie 由 proxy.ts 负责刷新。
          }
        },
      },
    }
  );
}

/** 当前登录用户（服务端唯一可信的登录判断），未登录返回 null */
export async function getCurrentUser() {
  const supabase = await getServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

/** 未授权异常：Server Action 中抛出后由调用方统一转换为表单错误 */
export class UnauthorizedError extends Error {
  constructor(message = "无权限执行此操作") {
    super(message);
    this.name = "UnauthorizedError";
  }
}

/**
 * 校验当前用户是否为博主（profiles.is_admin = true）。
 * 数据库查询失败时按「非管理员」处理（安全默认），
 * 并要求 profiles 表已通过迁移脚本创建。
 */
export async function requireAdmin(): Promise<{ id: string; email: string }> {
  const user = await getCurrentUser();
  if (!user?.email) throw new UnauthorizedError("请先登录");

  const supabase = await getServerSupabase();
  const { data, error } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .maybeSingle();

  if (error || !data?.is_admin) {
    throw new UnauthorizedError("仅博主可执行此操作");
  }

  return { id: user.id, email: user.email };
}
