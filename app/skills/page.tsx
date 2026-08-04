import type { Metadata } from "next";
import Link from "next/link";
import { getSiteSettings } from "@/lib/site";

export const metadata: Metadata = { title: "技能" };

/** 解析后台填写的技能文本（每行「名称 | 1-5」） */
function parseSkills(raw: string): { name: string; level: number }[] {
  return raw
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [name, level] = line.split("|").map((s) => s.trim());
      return {
        name: name ?? "",
        level: Math.min(5, Math.max(1, Number(level) || 1)),
      };
    })
    .filter((s) => s.name);
}

export default async function SkillsPage() {
  const settings = await getSiteSettings();
  const skills = parseSkills(settings.skills);

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <Link href="/" className="mb-6 inline-block text-sm text-fg-muted transition-colors hover:text-brand-300">
        ← 返回首页
      </Link>
      <h1 className="page-heading mb-2 text-3xl font-bold text-fg">🏷️ 技能标签</h1>
      <p className="mb-8 text-sm text-fg-faint">
        我常用的技术栈与熟练程度（1~5）。
      </p>

      {skills.length === 0 ? (
        <p className="rounded-2xl border border-ink-700/60 bg-ink-900/50 py-16 text-center text-fg-muted">
          技能清单暂未配置，后台「站点设置」→「技能清单」填写即可
        </p>
      ) : (
        <div className="space-y-5">
          {skills.map((skill) => (
            <div
              key={skill.name}
              className="rounded-2xl border border-ink-700/60 bg-ink-900/50 p-5"
            >
              <div className="mb-2 flex items-center justify-between text-sm">
                <span className="font-medium text-fg">{skill.name}</span>
                <span className="text-fg-faint">
                  {"★".repeat(skill.level)}
                  <span className="text-fg-faint/40">{"★".repeat(5 - skill.level)}</span>
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-ink-800">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-brand-500 to-glow-400 transition-all"
                  style={{ width: `${(skill.level / 5) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
