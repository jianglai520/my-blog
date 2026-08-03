import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import CommentForm from "./CommentForm";
import Markdown from "@/app/components/Markdown";
import ViewCounter from "@/app/components/ViewCounter";
import AttachmentEnhancer from "@/app/components/AttachmentEnhancer";
import CodeBlockCopy from "@/app/components/CodeBlockCopy";
import ReadingProgress from "@/app/components/ReadingProgress";
import Toc from "@/app/components/Toc";
import { getComments, getPostByIdentifier } from "@/lib/posts";
import { formatDateTime } from "@/lib/format";

const SITE_URL = "https://jianglai520.com";

type Props = {
  params: Promise<{ identifier: string }>;
};

/** 从文章生成语义化 URL（有 slug 用 slug，否则回退 id） */
function postUrl(post: { slug: string | null; id: number }): string {
  return post.slug ? `${SITE_URL}/posts/${post.slug}` : `${SITE_URL}/posts/${post.id}`;
}

/** Next 16 的 path 参数不自动解码，中文 slug 需显式 decodeURIComponent */
function decodeIdentifier(id: string): string {
  try {
    return decodeURIComponent(id);
  } catch {
    return id;
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { identifier: rawIdentifier } = await params;
  const identifier = decodeIdentifier(rawIdentifier);
  const post = await getPostByIdentifier(identifier);
  if (!post) return { title: "文章未找到" };

  return {
    title: post.title,
    description:
      post.excerpt ||
      post.content?.substring(0, 150) ||
      post.title,
    alternates: { canonical: postUrl(post) },
    openGraph: {
      title: post.title,
      description: post.excerpt || post.title,
      url: postUrl(post),
      type: "article",
      images: [
        {
          // 动态 OG 图：标题走 query（edge 运行时无法查库）
          url: `/og?title=${encodeURIComponent(post.title)}`,
          width: 1200,
          height: 630,
          alt: post.title,
        },
      ],
      publishedTime: post.created_at,
    },
  };
}

export default async function PostPage({ params }: Props) {
  const { identifier: rawIdentifier } = await params;
  const identifier = decodeIdentifier(rawIdentifier);
  const post = await getPostByIdentifier(identifier);

  if (!post) {
    notFound();
  }

  // 兼容旧链接：访问 /posts/<数字id> 时，若文章有 slug，永久重定向到语义化 URL
  if (/^\d+$/.test(identifier) && post.slug) {
    permanentRedirect(`/posts/${post.slug}`);
  }

  const comments = await getComments(post.id);

  // 文章级结构化数据（Article）
  const articleJsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    description: post.excerpt || undefined,
    datePublished: post.created_at,
    author: { "@type": "Person", name: "江来" },
    image: post.cover_image || `${SITE_URL}/og?title=${encodeURIComponent(post.title)}`,
    mainEntityOfPage: { "@type": "WebPage", "@id": postUrl(post) },
    url: postUrl(post),
  };

  return (
    <article className="mx-auto max-w-3xl px-4 py-10">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(articleJsonLd).replace(/</g, "\\u003c"),
        }}
      />
      <Link
        href="/"
        className="mb-6 inline-flex items-center gap-1 text-sm text-fg-muted transition-colors hover:text-brand-300"
      >
        ← 返回首页
      </Link>

      {/* 封面图（如有） */}
      {post.cover_image ? (
        <div className="relative mb-8 aspect-[2/1] w-full overflow-hidden rounded-2xl border border-ink-700/60">
          <Image
            src={post.cover_image}
            alt={post.title}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, 48rem"
          />
        </div>
      ) : null}

      <header className="mb-8">
        <h1 className="text-3xl font-bold leading-tight text-fg sm:text-4xl">
          {post.title}
        </h1>
        <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-fg-faint">
          <span>发布于 {formatDateTime(post.created_at)}</span>
          <ViewCounter postId={post.id} initialCount={post.view_count ?? 0} />
        </div>
        {post.tags.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {post.tags.map((tag) => (
              <Link
                key={tag.slug}
                href={`/tags/${tag.slug}`}
                className="rounded-full border border-brand-400/30 bg-brand-500/10 px-2.5 py-0.5 text-xs text-brand-300 transition-colors hover:bg-brand-500/20"
              >
                #{tag.name}
              </Link>
            ))}
          </div>
        )}
        {post.excerpt ? (
          <p className="mt-4 border-l-2 border-glow-500/60 pl-4 text-fg-muted">
            {post.excerpt}
          </p>
        ) : null}
      </header>

      {/* 文章目录 TOC（扫描 h2/h3 生成） */}
      <Toc />
      {/* 正文：Markdown 渲染（标题/列表/代码高亮/表格/图片） */}
      <Markdown source={post.content} />
      {/* 附件链接增强：PDF 新窗口预览、Office 文档加在线预览按钮 */}
      <AttachmentEnhancer />
      {/* 代码块复制按钮 */}
      <CodeBlockCopy />
      {/* 阅读进度条（顶部） */}
      <ReadingProgress />

      {/* ===== 评论区 ===== */}
      <section className="mt-14">
        <h2 className="mb-6 flex items-center gap-3 text-2xl font-semibold text-fg">
          <span className="h-5 w-1 rounded bg-gradient-to-b from-glow-400 to-brand-500" />
          评论 ({comments.length})
        </h2>

        {comments.length === 0 ? (
          <p className="rounded-2xl border border-ink-700/60 bg-ink-900/50 py-10 text-center text-fg-muted">
            还没有评论，来写第一条吧～
          </p>
        ) : (
          <div className="space-y-4">
            {comments.map((comment) => (
              <div
                key={comment.id}
                className="rounded-2xl border border-ink-700/60 bg-ink-900/60 p-5"
              >
                <div className="mb-2 flex items-center gap-2">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-600/30 text-sm font-bold text-brand-300">
                    {comment.name.charAt(0)}
                  </span>
                  <span className="font-medium text-fg">{comment.name}</span>
                  <span className="text-xs text-fg-faint">
                    {formatDateTime(comment.created_at)}
                  </span>
                </div>
                <p className="text-fg-muted">{comment.content}</p>
              </div>
            ))}
          </div>
        )}

        <CommentForm postId={post.id} identifier={identifier} />
      </section>
    </article>
  );
}
