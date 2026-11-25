"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

/**
 * 页码直达：输入 1..total 后跳转，省去连续点「下一页」。
 *
 * - `hrefTemplate` 形如 `/page/{page}` 或 `/tags/xx?page={page}`
 * - `page1Href` 用于第 1 页的特殊地址（首页是 `/`，标签页是不带 query 的地址）
 * - 父组件用 `key={current}` 挂载，翻页后输入框自动同步到当前页
 */
export default function PageJump({
  current,
  total,
  hrefTemplate,
  page1Href,
}: {
  current: number;
  total: number;
  hrefTemplate: string;
  page1Href?: string;
}) {
  const router = useRouter();
  const [value, setValue] = useState(String(current));
  const [invalid, setInvalid] = useState(false);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const next = Number(value.trim());

    if (!Number.isInteger(next) || next < 1 || next > total) {
      setInvalid(true);
      return;
    }

    setInvalid(false);
    if (next === current) return;

    router.push(
      next === 1 && page1Href
        ? page1Href
        : hrefTemplate.replace("{page}", String(next)),
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex items-center gap-1.5">
      <input
        type="number"
        inputMode="numeric"
        min={1}
        max={total}
        value={value}
        onChange={(e) => {
          setValue(e.target.value);
          setInvalid(false);
        }}
        aria-label="跳转到页码"
        aria-invalid={invalid}
        title={`输入 1-${total} 之间的页码`}
        className={`w-16 rounded-lg border bg-ink-800/40 px-2 py-2 text-center text-sm text-fg outline-none transition-colors ${
          invalid
            ? "border-red-500/70"
            : "border-ink-600 focus:border-brand-500"
        }`}
      />
      <button
        type="submit"
        className="rounded-lg border border-ink-600 px-3 py-2 text-fg-muted transition-colors hover:border-brand-500/50 hover:text-fg"
      >
        跳转
      </button>
    </form>
  );
}
