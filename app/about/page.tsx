import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { GitFork, Mail, GraduationCap, FileText, ExternalLink } from "lucide-react";
import { getPublishedPosts } from "@/lib/posts";
import { getSiteSettings } from "@/lib/site";
import MessageForm from "@/app/components/MessageForm";

export const metadata: Metadata = { title: "关于" };
export const dynamic = "force-dynamic";

export default async function AboutPage() {
  const [{ total }, settings] = await Promise.all([
    getPublishedPosts(1, 1),
    getSiteSettings(),
  ]);

  const hasAvatar = settings.avatar_url !== "";
  const links = [
    settings.github && {
      label: "GitHub",
      href: settings.github,
      icon: GitFork,
      external: true,
    },
    settings.email && { label: "邮箱", href: `mailto:${settings.email}`, icon: Mail },
  ].filter(Boolean) as {
    label: string;
    href: string;
    icon: typeof GitFork;
    external?: boolean;
  }[];

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <Link href="/" className="mb-6 inline-block text-sm text-fg-muted transition-colors hover:text-brand-300">
        ← 返回首页
      </Link>
      <h1 className="page-heading mb-8 text-3xl font-bold text-fg">关于我</h1>

      <div className="gradient-card space-y-6 rounded-2xl p-8">
        <div className="flex items-center gap-5">
          <div className="avatar-ring h-20 w-20 flex-shrink-0">
            {hasAvatar ? (
              <Image
                src={settings.avatar_url}
                alt={settings.author_name}
                width={80}
                height={80}
                className="h-full w-full rounded-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-glow-500 font-display text-2xl font-bold text-white">
                {settings.author_name.charAt(0)}
              </div>
            )}
          </div>
          <div>
            <p className="text-2xl font-semibold text-fg">{settings.author_name}</p>
            <p className="mt-1 text-sm text-fg-faint">{settings.intro}</p>
          </div>
        </div>

        <div className="text-fg-muted leading-relaxed">
          <p>{settings.bio}</p>
        </div>

        <ul className="space-y-2 text-sm text-fg-muted">
          <li className="flex items-center gap-2">
            <FileText size={15} className="text-fg-faint" />
            已发布文章：{total} 篇
          </li>
          {settings.school && (
            <li className="flex items-center gap-2">
              <GraduationCap size={15} className="text-fg-faint" />
              {settings.school_url ? (
                <a
                  href={settings.school_url}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="inline-flex items-center gap-1 text-brand-300 transition-colors hover:text-glow-400"
                >
                  {settings.school}
                  <ExternalLink size={12} />
                </a>
              ) : (
                settings.school
              )}
            </li>
          )}
          {links.map((link) => (
            <li key={link.label} className="flex items-center gap-2">
              <link.icon size={15} className="text-fg-faint" />
              <a
                href={link.href}
                target={link.external ? "_blank" : undefined}
                rel={link.external ? "noreferrer noopener" : undefined}
                className="inline-flex items-center gap-1 text-brand-300 transition-colors hover:text-glow-400"
              >
                {link.label}
                {link.external && <ExternalLink size={12} />}
              </a>
            </li>
          ))}
        </ul>
      </div>

      {/* ===== 站内私信（仅站长可见，不公开） ===== */}
      <section className="mt-10">
        <h2 className="mb-4 flex items-center gap-3 font-display text-xl font-semibold text-fg">
          <span className="h-5 w-1 rounded bg-gradient-to-b from-glow-400 to-brand-500" />
          ✉️ 给我发私信
        </h2>
        <p className="mb-6 text-sm text-fg-faint">
          想合作、交流或说点悄悄话？填下面的表单，内容仅站长可见，不会公开。
        </p>
        <div className="gradient-card rounded-2xl p-6">
          <MessageForm />
        </div>
      </section>
    </div>
  );
}
