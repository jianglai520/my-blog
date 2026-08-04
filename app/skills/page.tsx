import type { Metadata } from "next";
import Link from "next/link";
import { getSiteSettings } from "@/lib/site";
import { parseSkills } from "@/lib/skills";

export const metadata: Metadata = { title: "技能" };

/** 技能条：名称 + 星级 + 熟练度进度条 */
function SkillBar({ name, level }: { name: string; level: number }) {
  const width = `${(level / 5) * 100}%`;
  return (
    <div className="rounded-xl border border-ink-700/60 bg-ink-900/50 p-4">
      <div className="mb-2 flex items-center justify-between text-sm">
        <span className="font-medium text-fg">{name}</span>
        <span className="text-xs text-fg-faint" aria-label={`熟练度 ${level}/5`}>
          <span className="text-amber-400">
            {"★".repeat(level)}
          </span>
          <span className="text-ink-600">{"★".repeat(5 - level)}</span>
          <span className="ml-1">{level}/5</span>
        </span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-ink-800">
        <div
          className="h-full rounded-full bg-gradient-to-r from-brand-500 to-glow-400"
          style={{ width }}
        />
      </div>
    </div>
  );
}

export default async function SkillsPage() {
  const settings = await getSiteSettings();
  const skills = parseSkills(settings.skills);

  // 按分组聚合（保持填写顺序）
  const groups: { group: string; items: { name: string; level: number }[] }[] = [];
  for (const skill of skills) {
    const g = groups.find((x) => x.group === skill.group);
    if (g) g.items.push({ name: skill.name, level: skill.level });
    else groups.push({ group: skill.group, items: [{ name: skill.name, level: skill.level }] });
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <Link href="/" className="mb-6 inline-block text-sm text-fg-muted transition-colors hover:text-brand-300">
        ← 返回首页
      </Link>
      <h1 className="page-heading mb-2 text-3xl font-bold text-fg">🏷️ 技能标签</h1>
      <p className="mb-8 text-sm text-fg-faint">
        我常用的技术栈与熟练程度（1~5）。
      </p>

      {groups.length === 0 ? (
        <p className="rounded-2xl border border-ink-700/60 bg-ink-900/50 py-16 text-center text-fg-muted">
          技能清单暂未配置，后台「站点设置」→「技能清单」添加即可
        </p>
      ) : (
        <div className="space-y-10">
          {groups.map((group) => (
            <section key={group.group}>
              <h2 className="mb-4 flex items-center gap-3 font-display text-xl font-semibold text-fg">
                <span className="h-5 w-1 rounded bg-gradient-to-b from-glow-400 to-brand-500" />
                {group.group}
                <span className="text-sm font-normal text-fg-faint">
                  （{group.items.length} 项）
                </span>
              </h2>
              <div className="space-y-3">
                {group.items.map((skill) => (
                  <SkillBar key={skill.name} name={skill.name} level={skill.level} />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
