import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getPublicEnv } from "@/lib/env";

/**
 * 路由守卫（Next.js 16：middleware 已更名为 proxy）。
 * 仅作用于 /admin/*：刷新 session cookie，未登录访问后台重定向到登录页。
 */
export async function proxy(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl;

  // 旧分页链接 /?page=N → /page/N：让首页 `/` 保持静态 ISR
  if (pathname === "/" && searchParams.has("page")) {
    const page = Number(searchParams.get("page"));
    if (Number.isInteger(page) && page > 1) {
      const url = request.nextUrl.clone();
      url.pathname = `/page/${page}`;
      url.search = "";
      return NextResponse.redirect(url, 308);
    }
  }

  // 只有 /admin 需要 Supabase 会话刷新，其他路径直接放行
  if (!pathname.startsWith("/admin")) {
    return NextResponse.next();
  }

  // 清掉客户端可能伪造的内部请求头：只有本 proxy 能写入
  request.headers.delete("x-admin-id");
  request.headers.delete("x-admin-email");

  let supabaseResponse = NextResponse.next({ request });

  const { supabaseUrl, supabaseAnonKey } = getPublicEnv();

  const supabase = createServerClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // 验证会话：
  // - 项目使用 ES256 非对称签名，getClaims() 用 JWKS 本地验签（首次拉取后缓存），
  //   避免每个后台请求都跨区域调用 Supabase Auth。
  // - 验签失败 / 无会话 / 仍为 HS256 时，回退 getUser()（由 Auth 服务校验）。
  let authUser: { id: string; email: string } | null = null;

  try {
    const { data, error } = await supabase.auth.getClaims();
    const claims = data?.claims;
    if (!error && claims?.sub) {
      authUser = {
        id: claims.sub,
        email: typeof claims.email === "string" ? claims.email : "",
      };
    }
  } catch {
    // 交给下面的 getUser 兜底
  }

  if (!authUser) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) authUser = { id: user.id, email: user.email ?? "" };
  }

  // 把已验证的身份通过内部请求头传给页面 / Server Action，
  // 避免 requireAdmin() 再调一次 auth.getUser()（每次都是跨区域 HTTPS 往返）。
  if (authUser) {
    request.headers.set("x-admin-id", authUser.id);
    request.headers.set("x-admin-email", authUser.email);
  }

  // Server Action 的 POST 也命中 /admin，若被重定向会导致客户端报
  // "An unexpected response was received from the server"。
  // 这类请求放行，由 action 内的 requireAdmin() 鉴权并返回友好错误。
  const isServerAction =
    request.method === "POST" && request.headers.has("next-action");

  if (!authUser && !isServerAction && request.nextUrl.pathname.startsWith("/admin")) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", request.nextUrl.pathname);
    return NextResponse.redirect(url);
  }

  // 重建响应：确保 getUser 之后写入的请求头一定被转发
  const response = NextResponse.next({ request });
  for (const cookie of supabaseResponse.cookies.getAll()) {
    response.cookies.set(cookie);
  }
  return response;
}

export const config = {
  matcher: ["/admin/:path*", "/"],
};
