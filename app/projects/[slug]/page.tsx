import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { ExternalLink, FolderGit2, GitFork, ArrowLeft } from "lucide-react";
import { getSiteSettings } from "@/lib/site";
import { parseProjects, splitTech, projectSlug } from "@/lib/projects";

/** 详情页标题（SEO） */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const settings = await getSiteSettings();
  const projects = parseProjects(settings.projects);
  const project = projects.find((p, i) => projectSlug(p, i) === slug);
  return { title: project ? project.name : "项目" };
}

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const settings = await getSiteSettings();
  const projects = parseProjects(settings.projects);
  const project = projects.find((p, i) => projectSlug(p, i) === slug);

  if (!project) {
    notFound();
  }

  const techs = splitTech(project.tech);

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <Link
        href="/projects"
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-fg-muted transition-colors hover:text-brand-400"
      >
        <ArrowLeft size={15} /> 返回项目列表
      </Link>

      <article className="glass overflow-hidden rounded-2xl">
        {/* 封面大图（无封面用渐变占位） */}
        <div className="relative aspect-[16/9] w-full overflow-hidden">
          {project.cover ? (
            <Image
              src={project.cover}
              alt={project.name}
              fill
              className="object-cover"
              priority
              sizes="(max-width: 768px) 100vw, 48rem"
            />
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-gradient-to-br from-brand-500 via-brand-600 to-glow-500 px-6">
              <FolderGit2 size={32} className="text-white/50" />
              <span className="text-center font-display text-3xl font-bold leading-snug text-white/95">
                {project.name}
              </span>
            </div>
          )}
        </div>

        {/* 内容 */}
        <div className="space-y-5 p-6 sm:p-8">
          <header className="flex flex-wrap items-baseline justify-between gap-3">
            <h1 className="text-2xl font-bold leading-tight text-fg sm:text-3xl">
              {project.name}
            </h1>
            {project.year && (
              <span className="rounded-full border border-ink-600 bg-ink-800/40 px-3 py-1 text-sm text-fg-faint">
                {project.year}
              </span>
            )}
          </header>

          {techs.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {techs.map((t) => (
                <span
                  key={t}
                  className="rounded-full border border-brand-400/30 bg-brand-500/10 px-3 py-1 text-sm text-brand-400"
                >
                  {t}
                </span>
              ))}
            </div>
          )}

          {project.description && (
            <div className="border-t border-ink-700/50 pt-5">
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-fg-faint">
                项目简介
              </h2>
              <p className="whitespace-pre-wrap text-base leading-relaxed text-fg-muted">
                {project.description}
              </p>
            </div>
          )}

          {(project.link || project.github) && (
            <div className="flex flex-wrap gap-3 border-t border-ink-700/50 pt-5">
              {project.link && (
                <a
                  href={project.link}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="btn-gradient inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-medium text-white"
                >
                  访问项目 <ExternalLink size={15} />
                </a>
              )}
              {project.github && (
                <a
                  href={project.github}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="inline-flex items-center gap-2 rounded-full border border-ink-600 px-5 py-2.5 text-sm text-fg-muted transition-colors hover:border-brand-400/60 hover:text-fg"
                >
                  <GitFork size={15} /> GitHub
                </a>
              )}
            </div>
          )}
        </div>
      </article>
    </div>
  );
}
