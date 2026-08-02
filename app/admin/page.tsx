import { redirect } from "next/navigation";
import AdminClient from "./AdminClient";
import { getServerSupabase, requireAdmin } from "@/lib/server/supabase";
import type { Post } from "@/lib/posts";

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
  const { data: posts } = await supabase
    .from("posts")
    .select("id,slug,title,content,excerpt,cover_image,created_at,published,status")
    .order("created_at", { ascending: false });

  return <AdminClient userEmail={admin.email} posts={(posts as Post[]) || []} />;
}
