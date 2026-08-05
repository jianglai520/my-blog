import Link from "next/link";
import { GitFork, Mail, Feather, FileText } from "lucide-react";
import { getSiteSettings } from "@/lib/site";

export default async function SiteFooter() {
  const settings = await getSiteSettings();

  const socials = [
    settings.github && { label: "GitHub", href: settings.github, icon: GitFork },
    settings.email && { label: "邮箱", href: `mailto:${settings.email}`, icon: Mail },
  ].filter(Boolean) as { label: string; href: string; icon: typeof GitFork }[];

  return (
    <footer className="site-footer border-t border-ink-700/60 bg-ink-900/60">
      <div className="mx-auto max-w-5xl px-4 py-12">
        <div className="grid gap-10 md:grid-cols-3">
          <div>
            <h2 className="page-heading mb-3 font-display text-sm font-semibold text-fg">
              关于
            </h2>
            <p className="text-sm leading-relaxed text-fg-muted">
              {settings.bio}
            </p>
          </div>

          <div>
            <h2 className="page-heading mb-3 font-display text-sm font-semibold text-fg">
              关注我
            </h2>
            {socials.length === 0 ? (
              <p className="text-sm text-fg-faint">
                社交链接待补充（后台「站点设置」可配置）
              </p>
            ) : (
              <ul className="space-y-2">
                {socials.map((social) => (
                  <li key={social.label}>
                    <a
                      href={social.href}
                      target={social.href.startsWith("http") ? "_blank" : undefined}
                      rel={social.href.startsWith("http") ? "noreferrer noopener" : undefined}
                      className="group inline-flex items-center gap-2 text-sm text-fg-muted transition-colors hover:text-brand-300"
                    >
                      <social.icon size={15} className="text-fg-faint transition-colors group-hover:text-brand-300" />
                      {social.label}
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div>
            <h2 className="page-heading mb-3 font-display text-sm font-semibold text-fg">
              信息
            </h2>
            <ul className="space-y-2 text-sm text-fg-muted">
              <li>
                <Link href="/resume" className="inline-flex items-center gap-2 text-fg-muted transition-colors hover:text-brand-300">
                  <FileText size={14} className="text-fg-faint" />
                  在线简历
                </Link>
              </li>
              <li className="flex items-center gap-2 text-fg-faint">
                <Feather size={14} />
                © {new Date().getFullYear()} {settings.author_name} · jianglai520.com
              </li>
              {settings.icp && <li className="text-fg-faint">{settings.icp}</li>}
            </ul>
          </div>
        </div>
      </div>
    </footer>
  );
}
