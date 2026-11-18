import { redirect } from "next/navigation";
import AdminClient, { type AdminTab } from "./AdminClient";
import { requireAdmin } from "@/lib/server/supabase";
import { getSiteSettings } from "@/lib/site";
import { getStorageUsage } from "@/lib/storage";
import { getAdminInbox, getAdminPostsAndCounts } from "@/lib/admin-data";
import type { Post, Comment } from "@/lib/posts";

// 后台始终读最新数据，不做静态缓存
export const dynamic = "force-dynamic";

const VALID_TABS: AdminTab[] = [
  "posts",
  "comments",
  "projects",
  "skills",
  "settings",
];

/** 后台数据（Drizzle 直连，一次往返拿完） */
async function loadAdminData(tab: AdminTab) {
  const [postsAndCounts, siteSettings, storageUsage, inbox] = await Promise.all([
    getAdminPostsAndCounts(),
    getSiteSettings(),
    getStorageUsage(),
    tab === "comments" ? getAdminInbox() : Promise.resolve(null),
  ]);

  return { ...postsAndCounts, siteSettings, storageUsage, inbox };
}

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { tab: rawTab } = await searchParams;
  const tab: AdminTab = VALID_TABS.includes(rawTab as AdminTab)
    ? (rawTab as AdminTab)
    : "posts";

  // 鉴权与数据并行：数据查询不等认证完成，认证失败时直接丢弃结果
  const dataPromise = loadAdminData(tab);
  dataPromise.catch(() => {}); // 防止 redirect 时出现未处理的 rejection

  const admin = await requireAdmin().catch(() => null);
  if (!admin) redirect("/login?next=/admin");

  const data = await dataPromise;

  // 列表不传正文；编辑时由 getPostContent 按需取
  const adminPosts = data.posts.map((post) => ({
    ...post,
    content: "",
  })) as AdminPost[];

  return (
    <AdminClient
      userEmail={admin.email}
      posts={adminPosts}
      comments={(data.inbox?.comments ?? []) as Comment[]}
      guestbookMessages={data.inbox?.guestbook ?? []}
      messages={data.inbox?.messages ?? []}
      siteSettings={data.siteSettings}
      storageUsage={data.storageUsage}
      tab={tab}
      counts={data.counts}
    />
  );
}

type AdminPost = Post & { post_tags?: { tag: { name: string } }[] };
