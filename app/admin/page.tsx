import { redirect } from "next/navigation";
import AdminClient, { type AdminTab } from "./AdminClient";
import { getServerSupabase, requireAdmin } from "@/lib/server/supabase";
import { getSiteSettings } from "@/lib/site";
import { getStorageUsage } from "@/lib/storage";
import type { Post, Comment } from "@/lib/posts";
import type { GuestbookMessage, Message } from "@/db/schema";

// 后台始终读最新数据，不做静态缓存
export const dynamic = "force-dynamic";

const VALID_TABS: AdminTab[] = [
  "posts",
  "comments",
  "projects",
  "skills",
  "settings",
];

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  // 服务端鉴权：未登录 / 非博主一律重定向到登录页（proxy 已拦一道，这里是双保险）
  let admin;
  try {
    admin = await requireAdmin();
  } catch {
    redirect("/login?next=/admin");
  }

  const { tab: rawTab } = await searchParams;
  const tab: AdminTab = VALID_TABS.includes(rawTab as AdminTab)
    ? (rawTab as AdminTab)
    : "posts";

  const supabase = await getServerSupabase();

  // 文章列表只取元数据，不取全文；评论/留言/私信只在对应 Tab 加载
  const [
    { data: posts },
    { count: commentCount },
    { count: guestbookCount },
    { count: messageCount },
    siteSettings,
    storageUsage,
  ] = await Promise.all([
    supabase
      .from("posts")
      .select(
        "id,slug,title,excerpt,cover_image,created_at,published,status,pinned,post_tags(tag:tags(name))",
      )
      .order("created_at", { ascending: false }),
    supabase.from("comments").select("id", { count: "exact", head: true }),
    supabase
      .from("guestbook_messages")
      .select("id", { count: "exact", head: true }),
    supabase.from("messages").select("id", { count: "exact", head: true }),
    getSiteSettings(),
    getStorageUsage(),
  ]);

  let comments: Comment[] = [];
  let guestbook: GuestbookMessage[] = [];
  let messages: Message[] = [];

  if (tab === "comments") {
    const [commentRows, guestbookRows, messageRows] = await Promise.all([
      supabase
        .from("comments")
        .select("id,post_id,name,content,reply,replied_at,created_at,status")
        .order("created_at", { ascending: false })
        .limit(200),
      supabase
        .from("guestbook_messages")
        .select("id,name,content,reply,replied_at,created_at")
        .order("created_at", { ascending: false })
        .limit(200),
      supabase
        .from("messages")
        .select("id,name,contact,content,created_at")
        .order("created_at", { ascending: false })
        .limit(100),
    ]);
    comments = (commentRows.data ?? []) as Comment[];
    guestbook = (guestbookRows.data ?? []) as GuestbookMessage[];
    messages = (messageRows.data ?? []) as Message[];
  }

  // 列表不传正文；编辑时由 getPostContent 按需取
  const adminPosts = (
    (posts ?? []) as unknown as Omit<AdminPost, "content">[]
  ).map((post) => ({ ...post, content: "" })) as AdminPost[];

  return (
    <AdminClient
      userEmail={admin.email}
      posts={adminPosts}
      comments={comments}
      guestbookMessages={guestbook}
      messages={messages}
      siteSettings={siteSettings}
      storageUsage={storageUsage}
      tab={tab}
      counts={{
        posts: adminPosts.length,
        comments: commentCount ?? 0,
        guestbook: guestbookCount ?? 0,
        messages: messageCount ?? 0,
      }}
    />
  );
}

type AdminPost = Post & { post_tags?: { tag: { name: string } }[] };
