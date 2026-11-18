import { notFound, permanentRedirect } from "next/navigation";
import HomeContent from "@/app/HomeContent";

export const revalidate = 60;

/**
 * 首页分页：/page/2、/page/3…
 * 把分页从 `/?page=N` 移到路径上，首页 `/` 才能保持静态 ISR。
 */
export default async function HomePage({
  params,
}: {
  params: Promise<{ page: string }>;
}) {
  const { page: raw } = await params;
  const page = Number(raw);

  if (!Number.isInteger(page) || page < 1) notFound();
  if (page === 1) permanentRedirect("/");

  return <HomeContent page={page} />;
}
