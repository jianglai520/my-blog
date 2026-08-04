import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { ExternalLink, FolderGit2 } from "lucide-react";
import { getSiteSettings } from "@/lib/site";
import { parseProjects, splitTech } from "@/lib/projects";

export const metadata: Metadata = { title: "项目" };

export default async function ProjectsPage() {
  const settings = await getSiteSettings();
  const projects = parseProjects(settings.projects);

  return (
    <div className="mx-auto max-w-4xl px-4 py-12">
      <Link href="/" className="mb-6 inline-block text-sm text-fg-muted transition-colors hover:text-brand-300">
        ← 返回首页
      </Link>
      <h1 className="page-heading mb-2 text-3xl font-bold text-fg">📁 项目展示</h1>
      <p className="mb-8 text-sm text-fg-faint">
        我做过的一些项目（后台「站点设置」→「项目展示」随时可改）。
      </p>

      {projects.length === 0 ? (
        <p className="rounded-2xl border border-ink-700/60 bg-ink-900/50 py-16 text-center text-fg-muted">
          项目清单暂未配置，后台「站点设置」→「项目展示」添加即可
        </p>
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          {projects.map((project) => (
            <article
              key={project.name}
              className="group flex flex-col overflow-hidden rounded-2xl border border-ink-700/60 bg-ink-900/50 transition-colors hover:border-brand-500/40"
            >
              {/* 封面（无封面显示渐变占位） */}
              {project.cover ? (
                <div className="relative h-40 w-full overflow-hidden">
                  <Image
                    src={project.cover}
                    alt={project.name}
                    fill
                    className="object-cover transition-transform duration-300 group-hover:scale-105"
                    sizes="(max-width: 768px) 100vw, 40rem"
                  />
                </div>
              ) : (
                <div className="flex h-24 w-full items-center justify-center bg-gradient-to-br from-brand-500/20 to-glow-500/10">
                  <FolderGit2 size={32} className="text-brand-400/60" />
                </div>
              )}

              <div className="flex flex-1 flex-col p-5">
                <div className="mb-1 flex items-baseline justify-between gap-2">
                  <h2 className="text-lg font-semibold text-fg">{project.name}</h2>
                  {project.year && (
                    <span className="flex-shrink-0 text-xs text-fg-faint">{project.year}</span>
                  )}
                </div>

                {project.description && (
                  <p className="mb-3 text-sm leading-relaxed text-fg-muted">
                    {project.description}
                  </p>
                )}

                {project.tech && (
                  <div className="mb-4 flex flex-wrap gap-2">
                    {splitTech(project.tech).map((t) => (
                      <span
                        key={t}
                        className="rounded-full border border-brand-400/30 bg-brand-500/10 px-2.5 py-0.5 text-xs text-brand-300"
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                )}

                {(project.link || project.github) && (
                  <div className="mt-auto flex flex-wrap gap-3 pt-2 text-sm">
                    {project.link && (
                      <a
                        href={project.link}
                        target="_blank"
                        rel="noreferrer noopener"
                        className="inline-flex items-center gap-1 text-brand-300 transition-colors hover:text-glow-400"
                      >
                        访问项目 <ExternalLink size={13} />
                      </a>
                    )}
                    {project.github && (
                      <a
                        href={project.github}
                        target="_blank"
                        rel="noreferrer noopener"
                        className="inline-flex items-center gap-1 text-fg-muted transition-colors hover:text-fg"
                      >
                        GitHub <ExternalLink size={13} />
                      </a>
                    )}
                  </div>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
