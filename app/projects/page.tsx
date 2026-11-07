import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight, FolderGit2 } from "lucide-react";
import { getSiteSettings } from "@/lib/site";
import { parseProjects, splitTech, projectSlug } from "@/lib/projects";

export const metadata: Metadata = { title: "项目" };

export default async function ProjectsPage() {
  const settings = await getSiteSettings();
  const projects = parseProjects(settings.projects);

  return (
    <div className="mx-auto max-w-4xl px-4 py-12">
      <Link href="/" className="mb-6 inline-block text-sm text-fg-muted transition-colors hover:text-brand-400">
        ← 返回首页
      </Link>

      <header className="mb-8">
        <h1 className="mb-2 flex items-center gap-3 text-3xl font-bold text-fg">
          <span className="h-6 w-1 rounded bg-gradient-to-b from-glow-400 to-brand-500" />
          项目展示
        </h1>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-fg-faint">
          <span>我做过的项目</span>
          {projects.length > 0 && (
            <>
              <span className="text-ink-600">·</span>
              <span className="rounded-full border border-ink-600 bg-ink-800/40 px-2.5 py-0.5 text-xs">
                共 {projects.length} 个
              </span>
            </>
          )}
        </div>
      </header>

      {projects.length === 0 ? (
        <div className="glass rounded-2xl py-16 text-center">
          <p className="text-lg text-fg-muted">项目清单暂未配置</p>
          <p className="mt-2 text-sm text-fg-faint">后台「项目」管理中添加即可</p>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          {projects.map((project, idx) => {
            const slug = projectSlug(project, idx);
            return (
              <article
                key={`${slug}-${idx}`}
                className="glass group relative flex h-full flex-col overflow-hidden rounded-2xl transition-all duration-300 hover:-translate-y-1 hover:shadow-glow-lg"
              >
                {/* 整卡可点（stretched link） */}
                <Link href={`/projects/${slug}`} className="absolute inset-0 z-0" aria-label={project.name} />

                {/* 封面（统一 16:9；无封面用青绿渐变占位 + 首字） */}
                <div className="relative aspect-[16/9] shrink-0 overflow-hidden">
                  {project.cover ? (
                    <Image
                      src={project.cover}
                      alt={project.name}
                      fill
                      className="object-cover transition-transform duration-500 group-hover:scale-105"
                      sizes="(max-width: 768px) 100vw, 40rem"
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center gap-3 bg-gradient-to-br from-brand-500 via-brand-600 to-glow-500">
                      <span className="font-display text-5xl font-bold text-white/90">
                        {project.name.charAt(0)}
                      </span>
                      <FolderGit2 size={28} className="text-white/50" />
                    </div>
                  )}
                  <div className="absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-black/20 to-transparent" />
                </div>

                {/* 内容区：紧凑，只放名称/年份/技术栈 + 查看详情，不放简介 */}
                <div className="relative z-10 flex flex-1 flex-col gap-3 p-5">
                  <div className="flex items-baseline justify-between gap-2">
                    <h2 className="text-lg font-bold leading-snug text-fg transition-colors group-hover:text-brand-400">
                      {project.name}
                    </h2>
                    {project.year && (
                      <span className="flex-shrink-0 rounded-full border border-ink-600 bg-ink-800/40 px-2 py-0.5 text-xs text-fg-faint">
                        {project.year}
                      </span>
                    )}
                  </div>

                  {project.tech && (
                    <div className="flex flex-wrap gap-2">
                      {splitTech(project.tech).map((t) => (
                        <span
                          key={t}
                          className="rounded-full border border-brand-400/30 bg-brand-500/10 px-2.5 py-0.5 text-xs text-brand-400"
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="mt-auto inline-flex items-center gap-1 pt-1 text-sm text-fg-faint transition-colors group-hover:text-brand-400">
                    查看详情 <ArrowRight size={14} />
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
