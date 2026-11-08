import type { Metadata } from "next";
import Link from "next/link";
import {
  Code2,
  Database,
  Server,
  Sparkles,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import { getSiteSettings } from "@/lib/site";
import {
  groupSkills,
  parseSkills,
  LEVEL_LABELS,
  type SkillItem,
} from "@/lib/skills";

export const metadata: Metadata = { title: "技能" };

/** 分组图标与配色 */
const GROUP_META: Record<string, { icon: LucideIcon; ring: string }> = {
  前端: { icon: Code2, ring: "bg-brand-500/10 text-brand-400 ring-brand-400/20" },
  后端: { icon: Server, ring: "bg-glow-400/10 text-glow-400 ring-glow-400/20" },
  数据库: { icon: Database, ring: "bg-brand-500/10 text-brand-300 ring-brand-400/20" },
  工具: { icon: Wrench, ring: "bg-glow-500/10 text-glow-400 ring-glow-400/20" },
  其他: { icon: Sparkles, ring: "bg-brand-400/10 text-brand-300 ring-brand-400/20" },
};

/** 便当盒跨度（按分组顺序循环，制造大小错落） */
const BENTO_SPANS = [
  "md:col-span-4",
  "md:col-span-2",
  "md:col-span-3",
  "md:col-span-3",
  "md:col-span-2",
  "md:col-span-4",
];

function levelWidth(level: number): string {
  return `${(Math.min(5, Math.max(1, level)) / 5) * 100}%`;
}

function average(items: SkillItem[]): number {
  if (!items.length) return 0;
  return items.reduce((sum, s) => sum + s.level, 0) / items.length;
}

/** 能力雷达图（纯 SVG，无第三方库） */
function SkillRadar({ data }: { data: { group: string; avg: number }[] }) {
  const cx = 120;
  const cy = 120;
  const R = 82;
  const n = data.length;

  const point = (r: number, i: number) => {
    const rad = (((360 / n) * i - 90) * Math.PI) / 180;
    return [cx + r * Math.cos(rad), cy + r * Math.sin(rad)] as const;
  };

  const ring = (scale: number) =>
    data.map((_, i) => point(R * scale, i).join(",")).join(" ");

  const polygon = data
    .map((d, i) => point(R * Math.max(0.08, d.avg / 5), i).join(","))
    .join(" ");

  return (
    <svg viewBox="0 0 240 240" className="h-60 w-60" role="img" aria-label="能力雷达图">
      {[0.25, 0.5, 0.75, 1].map((scale) => (
        <polygon
          key={scale}
          points={ring(scale)}
          fill="none"
          stroke="currentColor"
          strokeWidth={1}
          className="text-ink-700"
        />
      ))}
      {data.map((_, i) => {
        const [x, y] = point(R, i);
        return (
          <line
            key={i}
            x1={cx}
            y1={cy}
            x2={x}
            y2={y}
            stroke="currentColor"
            strokeWidth={1}
            className="text-ink-700"
          />
        );
      })}
      <polygon
        points={polygon}
        fill="rgba(53,191,171,0.22)"
        stroke="#35bfab"
        strokeWidth={2}
        strokeLinejoin="round"
      />
      {data.map((d, i) => {
        const [x, y] = point(R * Math.max(0.08, d.avg / 5), i);
        return <circle key={i} cx={x} cy={y} r={3.5} fill="#35bfab" />;
      })}
      {data.map((d, i) => {
        const [x, y] = point(R + 20, i);
        return (
          <text
            key={d.group}
            x={x}
            y={y}
            textAnchor="middle"
            dominantBaseline="middle"
            fontSize={10}
            fill="currentColor"
            className="text-fg-muted"
          >
            {d.group}
          </text>
        );
      })}
    </svg>
  );
}

/** 分组平均分圆环 */
function GroupRing({ value }: { value: number }) {
  const pct = (value / 5) * 100;
  return (
    <div
      className="relative flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full"
      style={{
        background: `conic-gradient(var(--color-brand-500) ${pct}%, var(--color-ink-700) 0)`,
      }}
      aria-label={`分组平均熟练度 ${value.toFixed(1)}/5`}
    >
      <div className="absolute inset-[3px] flex items-center justify-center rounded-full bg-ink-900">
        <span className="text-[11px] font-semibold text-fg">{value.toFixed(1)}</span>
      </div>
    </div>
  );
}

/** 终端风格的 stack.ts 小卡（数据由真实技能生成） */
function StackTerminal({
  groups,
  total,
  className = "",
}: {
  groups: { group: string; items: SkillItem[] }[];
  total: number;
  className?: string;
}) {
  const MAX_GROUPS = 4;
  const MAX_PER_GROUP = 3;

  const lines = groups.slice(0, MAX_GROUPS).map((g) => {
    const names = g.items.slice(0, MAX_PER_GROUP).map((s) => `"${s.name}"`);
    const extra = g.items.length - MAX_PER_GROUP;
    return {
      group: g.group,
      value: `[${names.join(", ")}]`,
      extra: extra > 0 ? extra : 0,
    };
  });

  return (
    <div
      className={`overflow-hidden rounded-2xl border border-ink-700/60 bg-[#0a1a17] shadow-[0_12px_40px_rgba(0,0,0,0.18)] ${className}`}
    >
      {/* 窗口栏 */}
      <div className="flex items-center gap-1.5 border-b border-white/5 bg-[#0e2420] px-3 py-2">
        <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]" />
        <span className="h-2.5 w-2.5 rounded-full bg-[#febc2e]" />
        <span className="h-2.5 w-2.5 rounded-full bg-[#28c840]" />
        <span className="ml-2 font-mono text-[11px] text-[#94a8a3]">stack.ts</span>
        <span className="ml-auto font-mono text-[10px] text-[#5b7570]">
          {total} skills
        </span>
      </div>

      {/* 代码 */}
      <pre className="overflow-x-auto px-4 py-3 font-mono text-[11px] leading-relaxed text-[#c8d6d2]">
        <code>
          <span className="text-[#5b7570]">{`// auto-generated from /skills`}</span>
          {"\n"}
          <span className="text-[#6ee7d0]">const</span>{" "}
          <span className="text-[#a7f3e0]">stack</span>
          {" = {"}
          {"\n"}
          {lines.map((line) => (
            <span key={line.group}>
              {"  "}
              <span className="text-[#a7f3e0]">{`"${line.group}"`}</span>
              {": "}
              <span className="text-[#c8d6d2]">{line.value}</span>
              {line.extra > 0 && (
                <span className="text-[#5b7570]">{` /* +${line.extra} */`}</span>
              )}
              {","}
              {"\n"}
            </span>
          ))}
          {"}"}
          <span className="ml-0.5 animate-pulse text-[#6ee7d0]">▍</span>
        </code>
      </pre>
    </div>
  );
}

/** 普通技能行 */
function SkillBar({ skill }: { skill: SkillItem }) {
  return (
    <div className="group/skill rounded-lg border border-transparent px-2.5 py-2 transition-colors hover:border-ink-600/60 hover:bg-ink-800/30">
      <div className="mb-1.5 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-1.5">
            {skill.icon && (
              <span className="text-sm leading-none" aria-hidden="true">
                {skill.icon}
              </span>
            )}
            <span className="truncate text-sm font-medium text-fg">{skill.name}</span>
            {skill.years && (
              <span className="flex-shrink-0 rounded-full border border-ink-600 bg-ink-800/40 px-1.5 py-0.5 text-[10px] text-fg-faint">
                {skill.years}
              </span>
            )}
          </div>
          {skill.description && (
            <p className="mt-0.5 line-clamp-2 text-[11px] leading-relaxed text-fg-faint">
              {skill.description}
            </p>
          )}
        </div>
        <span className="flex-shrink-0 text-[11px] text-fg-muted">
          {LEVEL_LABELS[skill.level]}
        </span>
      </div>
      <div className="h-1 overflow-hidden rounded-full bg-ink-800">
        <div
          className="skill-bar-fill h-full rounded-full bg-gradient-to-r from-brand-500 to-glow-400"
          style={{ width: levelWidth(skill.level) }}
        />
      </div>
    </div>
  );
}

/** 核心技能大卡片 */
function FeaturedCard({ skill }: { skill: SkillItem }) {
  return (
    <div className="glass rounded-2xl p-5 transition-transform hover:-translate-y-0.5">
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          {skill.icon ? (
            <span className="text-lg leading-none" aria-hidden="true">
              {skill.icon}
            </span>
          ) : (
            <Sparkles size={17} className="flex-shrink-0 text-brand-400" />
          )}
          <span className="truncate font-semibold text-fg">{skill.name}</span>
        </div>
        <span className="flex-shrink-0 rounded-full border border-brand-400/30 bg-brand-500/10 px-2.5 py-0.5 text-xs font-medium text-brand-300">
          {LEVEL_LABELS[skill.level]}
        </span>
      </div>
      {skill.description && (
        <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-fg-muted">
          {skill.description}
        </p>
      )}
      <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-ink-800">
        <div
          className="skill-bar-fill h-full rounded-full bg-gradient-to-r from-brand-500 to-glow-400"
          style={{ width: levelWidth(skill.level) }}
        />
      </div>
    </div>
  );
}

export default async function SkillsPage() {
  const settings = await getSiteSettings();
  const skills = parseSkills(settings.skills);
  const groups = groupSkills(skills);

  const total = skills.length;
  const overall = average(skills);
  const featured = skills.filter((s) => s.featured);
  const radarData = groups.map((g) => ({ group: g.group, avg: average(g.items) }));

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
          技能
        </h1>
        <p className="text-sm text-fg-faint">能力分布与技术栈（熟练度 1~5）</p>
      </header>

      {total === 0 ? (
        <div className="glass rounded-2xl py-16 text-center">
          <p className="text-lg text-fg-muted">技能清单暂未配置</p>
          <p className="mt-2 text-sm text-fg-faint">后台「技能」管理中添加即可</p>
        </div>
      ) : (
        <>
          {/* ===== 顶部 Bento：雷达图 + 概览 ===== */}
          <div className="grid gap-4 md:grid-cols-6">
            <section className="glass flex h-full flex-col rounded-2xl p-5 md:col-span-4 md:row-span-2">
              <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold text-fg">
                <Sparkles size={15} className="text-brand-400" />
                能力分布
              </h2>
              <div className="flex flex-1 flex-col items-center justify-center gap-4 sm:flex-row sm:items-center">
                {radarData.length >= 3 ? (
                  <SkillRadar data={radarData} />
                ) : (
                  <p className="py-10 text-sm text-fg-faint">
                    分组少于 3 个，暂不展示雷达图
                  </p>
                )}
                <div className="grid w-full gap-1.5 sm:max-w-[220px]">
                  {radarData.map((d) => (
                    <div
                      key={d.group}
                      className="flex items-center justify-between gap-3 rounded-lg px-2 py-1 text-sm"
                    >
                      <span className="text-fg-muted">{d.group}</span>
                      <span className="font-medium text-fg">{d.avg.toFixed(1)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            <section className="glass flex flex-col justify-between rounded-2xl p-5 md:col-span-2">
              <h2 className="mb-4 text-sm font-semibold text-fg">概览</h2>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div>
                  <div className="font-display text-2xl font-bold text-fg">{total}</div>
                  <div className="mt-0.5 text-[11px] text-fg-faint">项技能</div>
                </div>
                <div>
                  <div className="font-display text-2xl font-bold text-fg">
                    {groups.length}
                  </div>
                  <div className="mt-0.5 text-[11px] text-fg-faint">个分组</div>
                </div>
                <div>
                  <div className="font-display text-2xl font-bold text-fg">
                    {overall.toFixed(1)}
                  </div>
                  <div className="mt-0.5 text-[11px] text-fg-faint">平均分</div>
                </div>
              </div>
              <div className="mt-5 border-t border-ink-700/50 pt-4">
                <div className="mb-1.5 flex items-center justify-between text-xs text-fg-faint">
                  <span>整体熟练度</span>
                  <span>{overall.toFixed(1)} / 5</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-ink-800">
                  <div
                    className="skill-bar-fill h-full rounded-full bg-gradient-to-r from-brand-500 to-glow-400"
                    style={{ width: levelWidth(overall) }}
                  />
                </div>
              </div>
            </section>

            <StackTerminal groups={groups} total={total} className="md:col-span-2" />
          </div>

          {/* ===== 核心技术栈 ===== */}
          {featured.length > 0 && (
            <section className="mt-8">
              <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-fg">
                <Sparkles size={17} className="text-brand-400" />
                核心技术栈
              </h2>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {featured.map((skill) => (
                  <FeaturedCard key={`${skill.group}-${skill.name}`} skill={skill} />
                ))}
              </div>
            </section>
          )}

          {/* ===== 分类 Bento ===== */}
          <section className="mt-8">
            <h2 className="mb-4 text-lg font-semibold text-fg">分类技能</h2>
            <div className="grid gap-4 md:grid-cols-6">
              {groups.map((group, index) => {
                const meta = GROUP_META[group.group] ?? GROUP_META["其他"];
                const Icon = meta.icon;
                const avg = average(group.items);
                const span =
                  groups.length === 1
                    ? "md:col-span-6"
                    : BENTO_SPANS[index % BENTO_SPANS.length];

                return (
                  <section
                    key={group.group}
                    className={`glass rounded-2xl p-5 ${span}`}
                  >
                    <header className="mb-4 flex items-center justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-3">
                        <span
                          className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl ring-1 ${meta.ring}`}
                        >
                          <Icon size={17} />
                        </span>
                        <div className="min-w-0">
                          <h3 className="truncate font-display text-base font-semibold text-fg">
                            {group.group}
                          </h3>
                          <p className="text-[11px] text-fg-faint">
                            {group.items.length} 项技能
                          </p>
                        </div>
                      </div>
                      <GroupRing value={avg} />
                    </header>
                    <div className="space-y-1">
                      {group.items.map((skill) => (
                        <SkillBar key={`${skill.group}-${skill.name}`} skill={skill} />
                      ))}
                    </div>
                  </section>
                );
              })}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
