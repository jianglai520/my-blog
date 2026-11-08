import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import {
  ExternalLink,
  FileText,
  GitFork,
  GraduationCap,
  Mail,
} from "lucide-react";
import { getPublishedPosts } from "@/lib/posts";
import { getSiteSettings } from "@/lib/site";
import { parseProjects, projectSlug, splitTech } from "@/lib/projects";
import { LEVEL_LABELS, parseSkills } from "@/lib/skills";
import { parseResume } from "@/lib/resume";
import MessageForm from "@/app/components/MessageForm";

export const metadata: Metadata = { title: "关于" };
export const dynamic = "force-dynamic";

/** 从 GitHub 链接推导 @handle；失败回退站点名 */
function githubHandle(url: string): string {
  if (!url) return "jianglai520";
  try {
    const seg = new URL(url).pathname.split("/").filter(Boolean)[0];
    return seg || "jianglai520";
  } catch {
    return "jianglai520";
  }
}

/** 关于页展示上限：名片只做摘要，完整内容去对应页面 */
const ABOUT_PROJECT_LIMIT = 2;
const ABOUT_SKILL_LIMIT = 8;
const ABOUT_RESUME_LIMIT = 4;

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="mb-4 flex items-center gap-2.5 text-lg font-semibold text-fg">
      <span className="h-4 w-1 rounded bg-gradient-to-b from-glow-400 to-brand-500" />
      {children}
    </h2>
  );
}

export default async function AboutPage() {
  const [{ total }, settings] = await Promise.all([
    getPublishedPosts(1, 1),
    getSiteSettings(),
  ]);

  const hasAvatar = settings.avatar_url !== "";
  const projects = parseProjects(settings.projects);
  const skills = parseSkills(settings.skills);
  const resume = parseResume(settings.resume);
  const handle = githubHandle(settings.github);

  // 关于页只展示摘要：项目 / 技能 / 经历都有上限
  const shownProjects = projects.slice(0, ABOUT_PROJECT_LIMIT);
  const topSkills = [...skills]
    .sort(
      (a, b) =>
        Number(Boolean(b.featured)) - Number(Boolean(a.featured)) ||
        b.level - a.level,
    )
    .slice(0, ABOUT_SKILL_LIMIT);
  const shownResume = resume.slice(0, ABOUT_RESUME_LIMIT);

  const links = [
    settings.github && {
      label: "GitHub",
      href: settings.github,
      icon: GitFork,
      external: true,
    },
    settings.email && { label: "邮箱", href: `mailto:${settings.email}`, icon: Mail },
    settings.school && settings.school_url
      ? {
          label: settings.school,
          href: settings.school_url,
          icon: GraduationCap,
          external: true,
        }
      : null,
  ].filter(Boolean) as {
    label: string;
    href: string;
    icon: typeof GitFork;
    external?: boolean;
  }[];

  return (
    <div className="mx-auto max-w-5xl px-4 py-12">
      <Link
        href="/"
        className="mb-6 inline-block text-sm text-fg-muted transition-colors hover:text-brand-400"
      >
        ← 返回首页
      </Link>

      <header className="mb-8">
        <h1 className="mb-2 flex items-center gap-3 text-3xl font-bold text-fg">
          <span className="h-6 w-1 rounded bg-gradient-to-b from-glow-400 to-brand-500" />
          关于
        </h1>
        <p className="text-sm text-fg-faint">开发者名片 · 项目 · 经历 · 联系方式</p>
      </header>

      <div className="grid gap-6 md:grid-cols-[300px_1fr] md:items-start">
        {/* ===== 左侧：开发者名片 ===== */}
        <aside className="glass rounded-2xl p-6 md:sticky md:top-24">
          <div className="avatar-ring mb-4 h-20 w-20">
            {hasAvatar ? (
              <Image
                src={settings.avatar_url}
                alt={settings.author_name}
                width={80}
                height={80}
                className="h-full w-full rounded-full object-cover"
                priority
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-glow-500 font-display text-2xl font-bold text-white">
                {settings.author_name.charAt(0)}
              </div>
            )}
          </div>

          <h2 className="font-display text-2xl font-bold text-fg">
            {settings.author_name}
          </h2>
          <p className="mt-1 font-mono text-xs text-fg-faint">@{handle}</p>
          <p className="mt-3 text-sm leading-relaxed text-fg-muted">
            {settings.intro}
          </p>

          {links.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {links.map((link) => (
                <a
                  key={link.label}
                  href={link.href}
                  target={link.external ? "_blank" : undefined}
                  rel={link.external ? "noreferrer noopener" : undefined}
                  className="inline-flex items-center gap-1.5 rounded-full border border-brand-400/30 bg-brand-500/10 px-2.5 py-1 text-xs text-brand-300 transition-colors hover:border-brand-400/60 hover:bg-brand-500/15"
                >
                  <link.icon size={12} />
                  {link.label}
                  {link.external && <ExternalLink size={10} />}
                </a>
              ))}
            </div>
          )}

          <div className="mt-5 grid grid-cols-3 gap-2 border-t border-ink-700/50 pt-4 text-center">
            <div>
              <div className="font-display text-lg font-bold text-fg">{total}</div>
              <div className="text-[11px] text-fg-faint">文章</div>
            </div>
            <div>
              <div className="font-display text-lg font-bold text-fg">{skills.length}</div>
              <div className="text-[11px] text-fg-faint">技能</div>
            </div>
            <div>
              <div className="font-display text-lg font-bold text-fg">
                {projects.length}
              </div>
              <div className="text-[11px] text-fg-faint">项目</div>
            </div>
          </div>
        </aside>

        {/* ===== 右侧：内容 ===== */}
        <div className="space-y-6">
          {/* 关于我 */}
          <section className="glass rounded-2xl p-6">
            <SectionTitle>关于我</SectionTitle>
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-fg-muted">
              {settings.bio}
            </p>
          </section>

          {/* Pinned 项目 */}
          {projects.length > 0 && (
            <section>
              <SectionTitle>Pinned 项目</SectionTitle>
              <div className="grid gap-4 sm:grid-cols-2">
                {shownProjects.map((project, index) => (
                  <Link
                    key={`${project.name}-${index}`}
                    href={`/projects/${projectSlug(project, index)}`}
                    className="glass group flex flex-col rounded-2xl p-5 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-glow"
                  >
                    <div className="flex items-center gap-2">
                      <FileText size={15} className="text-brand-400" />
                      <h3 className="truncate text-sm font-semibold text-fg transition-colors group-hover:text-brand-400">
                        {project.name}
                      </h3>
                      {project.year && (
                        <span className="ml-auto flex-shrink-0 font-mono text-[11px] text-fg-faint">
                          {project.year}
                        </span>
                      )}
                    </div>
                    {project.description && (
                      <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-fg-muted">
                        {project.description}
                      </p>
                    )}
                    {project.tech && (
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {splitTech(project.tech)
                          .slice(0, 5)
                          .map((t) => (
                            <span
                              key={t}
                              className="rounded-full border border-ink-600 bg-ink-800/40 px-2 py-0.5 text-[10px] text-fg-faint"
                            >
                              {t}
                            </span>
                          ))}
                      </div>
                    )}
                  </Link>
                ))}
              </div>
              {projects.length > ABOUT_PROJECT_LIMIT && (
                <Link
                  href="/projects"
                  className="mt-4 inline-flex items-center gap-1 text-xs text-brand-300 transition-colors hover:text-brand-400"
                >
                  查看全部 {projects.length} 个项目 →
                </Link>
              )}
            </section>
          )}

          {/* 技能 */}
          {skills.length > 0 && (
            <section className="glass rounded-2xl p-6">
              <SectionTitle>技能</SectionTitle>
              <div className="flex flex-wrap gap-2">
                {topSkills.map((skill) => (
                  <span
                    key={`${skill.group}-${skill.name}`}
                    title={`${LEVEL_LABELS[skill.level]} ${skill.level}/5`}
                    className="inline-flex items-center gap-1.5 rounded-full border border-brand-400/30 bg-brand-500/10 px-3 py-1 text-xs text-brand-300"
                  >
                    {skill.icon && <span aria-hidden="true">{skill.icon}</span>}
                    {skill.name}
                    <span className="font-mono text-[10px] text-brand-400/70">
                      {skill.level}
                    </span>
                  </span>
                ))}
              </div>
              {skills.length > ABOUT_SKILL_LIMIT && (
                <Link
                  href="/skills"
                  className="mt-4 inline-flex items-center gap-1 text-xs text-brand-300 transition-colors hover:text-brand-400"
                >
                  查看全部 {skills.length} 项技能 →
                </Link>
              )}
            </section>
          )}

          {/* 经历 */}
          {resume.length > 0 && (
            <section className="glass rounded-2xl p-6">
              <SectionTitle>经历</SectionTitle>
              <div className="space-y-3">
                {shownResume.map((item, index) => (
                  <div
                    key={`${item.type}-${item.title}-${index}`}
                    className="flex items-start justify-between gap-4 border-b border-ink-700/40 pb-3 last:border-b-0 last:pb-0"
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full border border-ink-600 bg-ink-800/40 px-2 py-0.5 text-[10px] text-fg-faint">
                          {item.type}
                        </span>
                        <span className="text-sm font-medium text-fg">{item.title}</span>
                      </div>
                      {item.org && (
                        <p className="mt-1 text-xs text-fg-muted">{item.org}</p>
                      )}
                      {item.desc && (
                        <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-fg-faint">
                          {item.desc}
                        </p>
                      )}
                    </div>
                    {item.time && (
                      <span className="flex-shrink-0 font-mono text-[11px] text-fg-faint">
                        {item.time}
                      </span>
                    )}
                  </div>
                ))}
              </div>
              {resume.length > ABOUT_RESUME_LIMIT && (
                <Link
                  href="/resume"
                  className="mt-4 inline-flex items-center gap-1 text-xs text-brand-300 transition-colors hover:text-brand-400"
                >
                  查看完整简历 →
                </Link>
              )}
            </section>
          )}

          {/* 私信 */}
          <section id="contact" className="glass rounded-2xl p-6">
            <SectionTitle>给我发私信</SectionTitle>
            <p className="mb-5 text-sm text-fg-faint">
              想合作、交流或说点悄悄话？填下面的表单，内容仅站长可见，不会公开。
            </p>

            {/* 开发者风格的 contact 摘要（装饰） */}
            <div className="mb-5 overflow-hidden rounded-xl border border-ink-700/60 bg-[#0a1a17] px-4 py-3 font-mono text-[11px] leading-relaxed text-[#c8d6d2]">
              <div className="text-[#5b7570]">{"// contact"}</div>
              <div>
                <span className="text-[#6ee7d0]">const</span>{" "}
                <span className="text-[#a7f3e0]">me</span> = {"{"}
              </div>
              <div>
                &nbsp;&nbsp;github:{" "}
                <span className="text-[#a7f3e0]">&quot;{handle}&quot;</span>,
              </div>
              {settings.school && (
                <div>
                  &nbsp;&nbsp;school:{" "}
                  <span className="text-[#a7f3e0]">&quot;{settings.school}&quot;</span>,
                </div>
              )}
              <div>
                &nbsp;&nbsp;openTo: [
                <span className="text-[#a7f3e0]">&quot;实习&quot;</span>,{" "}
                <span className="text-[#a7f3e0]">&quot;合作&quot;</span>],
              </div>
              <div>{"};"}</div>
              <div className="mt-1 text-[#94a8a3]">
                <span className="text-[#6ee7d0]">$</span> send-message{" "}
                <span className="text-[#6ee7d0]">--private</span>
              </div>
            </div>

            <MessageForm />
          </section>
        </div>
      </div>
    </div>
  );
}
