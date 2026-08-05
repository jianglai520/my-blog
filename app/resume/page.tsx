import type { Metadata } from "next";
import Link from "next/link";
import { Mail, GitFork, GraduationCap, ExternalLink } from "lucide-react";
import { getSiteSettings } from "@/lib/site";
import { parseSkills } from "@/lib/skills";
import { parseProjects } from "@/lib/projects";
import { parseResume, RESUME_TYPES } from "@/lib/resume";
import PrintButton from "./PrintButton";

export const metadata: Metadata = { title: "在线简历" };

/** 技能 → 分组标签文本 */
function skillGroups(skills: ReturnType<typeof parseSkills>) {
  const groups = new Map<string, string[]>();
  for (const s of skills) {
    const list = groups.get(s.group) ?? [];
    list.push(s.name);
    groups.set(s.group, list);
  }
  return [...groups.entries()];
}

export default async function ResumePage() {
  const settings = await getSiteSettings();
  const resume = parseResume(settings.resume);
  const skills = parseSkills(settings.skills);
  const projects = parseProjects(settings.projects).slice(0, 3);

  const contacts = [
    settings.email && { label: settings.email, href: `mailto:${settings.email}`, icon: Mail },
    settings.github && { label: "GitHub", href: settings.github, icon: GitFork, external: true },
  ].filter(Boolean) as { label: string; href: string; icon: typeof Mail; external?: boolean }[];

  return (
    <div className="resume-page mx-auto max-w-3xl px-4 py-12">
      {/* 打印按钮（打印时隐藏） */}
      <div className="no-print mb-6 flex items-center justify-between">
        <Link href="/" className="text-sm text-fg-muted transition-colors hover:text-brand-300">
          ← 返回首页
        </Link>
        <PrintButton />
      </div>

      {/* 简历主体 */}
      <div className="resume-card rounded-2xl border border-ink-700/60 bg-ink-900/50 p-8">
        {/* 头部 */}
        <header className="mb-8 border-b border-ink-700/60 pb-6">
          <h1 className="text-3xl font-bold text-fg">{settings.author_name}</h1>
          {settings.intro && (
            <p className="mt-1 text-sm text-fg-muted">{settings.intro}</p>
          )}
          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-fg-muted">
            {settings.school && (
              <span className="inline-flex items-center gap-1.5">
                <GraduationCap size={14} className="text-fg-faint" />
                {settings.school}
              </span>
            )}
            {contacts.map((c) => (
              <a
                key={c.label}
                href={c.href}
                target={c.external ? "_blank" : undefined}
                rel={c.external ? "noreferrer noopener" : undefined}
                className="inline-flex items-center gap-1.5 text-brand-300 transition-colors hover:text-glow-400"
              >
                <c.icon size={14} />
                {c.label}
              </a>
            ))}
          </div>
        </header>

        {/* 教育 / 经历 / 奖项 */}
        {resume.length > 0 && (
          <section className="mb-8">
            {RESUME_TYPES.map((type) => {
              const items = resume.filter((r) => r.type === type);
              if (!items.length) return null;
              return (
                <div key={type} className="mb-6 last:mb-0">
                  <h2 className="mb-3 font-display text-lg font-semibold text-fg">{type}</h2>
                  <div className="space-y-4">
                    {items.map((item, i) => (
                      <div key={i}>
                        <div className="flex flex-wrap items-baseline justify-between gap-2">
                          <h3 className="font-medium text-fg">{item.title}</h3>
                          {item.time && (
                            <span className="text-xs text-fg-faint">{item.time}</span>
                          )}
                        </div>
                        {item.org && <p className="text-sm text-fg-muted">{item.org}</p>}
                        {item.desc && (
                          <p className="mt-1 text-sm leading-relaxed text-fg-muted">{item.desc}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </section>
        )}

        {/* 技能 */}
        {skills.length > 0 && (
          <section className="mb-8">
            <h2 className="mb-3 font-display text-lg font-semibold text-fg">技能</h2>
            <div className="space-y-2">
              {skillGroups(skills).map(([group, names]) => (
                <p key={group} className="text-sm leading-relaxed text-fg-muted">
                  <span className="mr-2 font-medium text-fg">{group}：</span>
                  {names.join(" / ")}
                </p>
              ))}
            </div>
          </section>
        )}

        {/* 项目精选 */}
        {projects.length > 0 && (
          <section>
            <h2 className="mb-3 font-display text-lg font-semibold text-fg">项目经历</h2>
            <div className="space-y-4">
              {projects.map((p) => (
                <div key={p.name}>
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <h3 className="font-medium text-fg">{p.name}</h3>
                    {p.year && <span className="text-xs text-fg-faint">{p.year}</span>}
                  </div>
                  {p.tech && (
                    <p className="mt-0.5 text-xs text-brand-300">
                      {p.tech.split(/[,，]/).map((t) => t.trim()).filter(Boolean).join(" · ")}
                    </p>
                  )}
                  {p.description && (
                    <p className="mt-1 text-sm leading-relaxed text-fg-muted">{p.description}</p>
                  )}
                  {(p.link || p.github) && (
                    <div className="mt-1 flex gap-4 text-sm">
                      {p.link && (
                        <a
                          href={p.link}
                          target="_blank"
                          rel="noreferrer noopener"
                          className="inline-flex items-center gap-1 text-brand-300 hover:text-glow-400"
                        >
                          在线预览 <ExternalLink size={12} />
                        </a>
                      )}
                      {p.github && (
                        <a
                          href={p.github}
                          target="_blank"
                          rel="noreferrer noopener"
                          className="inline-flex items-center gap-1 text-fg-muted hover:text-fg"
                        >
                          GitHub <ExternalLink size={12} />
                        </a>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {resume.length === 0 && skills.length === 0 && projects.length === 0 && (
          <p className="py-10 text-center text-sm text-fg-muted">
            简历内容尚未配置，后台「站点设置」→「简历经历」添加
          </p>
        )}
      </div>
    </div>
  );
}
