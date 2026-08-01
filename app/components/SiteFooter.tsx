import Link from "next/link";

const SOCIALS = [
  {
    label: "GitHub",
    href: "https://github.com",
    placeholder: true,
  },
  {
    label: "X / Twitter",
    href: "https://x.com",
    placeholder: true,
  },
  {
    label: "邮箱",
    href: "mailto:hi@jianglai520.com",
    placeholder: true,
  },
];

export default function SiteFooter() {
  return (
    <footer className="border-t border-ink-700/60 bg-ink-900/60">
      <div className="mx-auto max-w-5xl px-4 py-10">
        <div className="grid gap-10 md:grid-cols-3">
          <div>
            <h2 className="mb-3 font-display text-sm font-semibold text-fg">
              关于
            </h2>
            <p className="text-sm leading-relaxed text-fg-muted">
              个人博客，记录技术实践、学习心得与生活思考。
              这里是我的数字花园。
            </p>
          </div>

          <div>
            <h2 className="mb-3 font-display text-sm font-semibold text-fg">
              关注我
            </h2>
            <p className="mb-2 text-xs text-fg-faint">（占位链接，待补充真实地址）</p>
            <ul className="space-y-2">
              {SOCIALS.map((social) => (
                <li key={social.label}>
                  <Link
                    href={social.href}
                    className="text-sm text-fg-muted transition-colors hover:text-brand-300"
                  >
                    {social.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h2 className="mb-3 font-display text-sm font-semibold text-fg">
              信息
            </h2>
            <ul className="space-y-2 text-sm text-fg-muted">
              <li className="text-fg-faint">
                © {new Date().getFullYear()} jianglai520.com
              </li>
              <li className="text-fg-faint">备案号占位：待填写</li>
            </ul>
          </div>
        </div>
      </div>
    </footer>
  );
}
