import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * 路由守卫（Next.js 16：middleware 已更名为 proxy）。
 * 仅作用于 /admin/*：刷新 session cookie，未登录访问后台重定向到登录页。
 */
export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
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

  // 重要：不要用 getSession()，它会无条件信任 cookie 而不会向 Auth 服务器验证。
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Server Action 的 POST 也命中 /admin，若被重定向会导致客户端报
  // "An unexpected response was received from the server"。
  // 这类请求放行，由 action 内的 requireAdmin() 鉴权并返回友好错误。
  const isServerAction =
    request.method === "POST" && request.headers.has("next-action");

  if (!user && !isServerAction && request.nextUrl.pathname.startsWith("/admin")) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", request.nextUrl.pathname);
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}

export const config = {
  matcher: ["/admin/:path*"],
};
