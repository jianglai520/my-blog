import { redirect } from "next/navigation";
import AdminClient from "./AdminClient";
import { getServerSupabase, requireAdmin } from "@/lib/server/supabase";
import { getSiteSettings } from "@/lib/site";
import type { Post, Comment } from "@/lib/posts";

// 后台始终读最新数据，不做静态缓存
export const dynamic = "force-dynamic";

export default async function AdminPage() {
  // 服务端鉴权：未登录 / 非博主一律重定向到登录页（proxy 已拦一道，这里是双保险）
  let admin;
  try {
    admin = await requireAdmin();
  } catch {
    redirect("/login?next=/admin");
  }

  const supabase = await getServerSupabase();
  const [{ data: posts }, { data: comments }] = await Promise.all([
    supabase
      .from("posts")
      .select("id,slug,title,content,excerpt,cover_image,created_at,published,status,post_tags(tag:tags(name))")
      .order("created_at", { ascending: false }),
    supabase
      .from("comments")
      .select("id,post_id,name,content,created_at,status")
      .order("created_at", { ascending: false })
      .limit(200),
  ]);

  const siteSettings = await getSiteSettings();

  return (
    <AdminClient
      userEmail={admin.email}
      posts={((posts ?? []) as unknown as AdminPost[]) }
      comments={((comments ?? []) as Comment[]) || []}
      siteSettings={siteSettings}
    />
  );
}

/* 后台文章行（含标签嵌套，来自 supabase-js 返回结构） */
type AdminPost = Post & { post_tags?: { tag: { name: string } }[] };
