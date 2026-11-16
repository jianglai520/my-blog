"use client";

import { useEffect, useState } from "react";

/** 站点上线时间（首个提交日） */
const LAUNCH_AT = new Date("2026-06-28T00:00:00+08:00");

type Uptime = {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
};

function diff(now: Date): Uptime {
  const ms = Math.max(0, now.getTime() - LAUNCH_AT.getTime());
  return {
    days: Math.floor(ms / 86_400_000),
    hours: Math.floor((ms % 86_400_000) / 3_600_000),
    minutes: Math.floor((ms % 3_600_000) / 60_000),
    seconds: Math.floor((ms % 60_000) / 1_000),
  };
}

const pad = (n: number) => String(n).padStart(2, "0");

/**
 * 本站运行时长（页脚）。
 * 首屏渲染占位符，挂载后再计算，避免服务端/客户端时间不一致导致 hydration 报错。
 */
export default function SiteUptime() {
  const [uptime, setUptime] = useState<Uptime | null>(null);

  useEffect(() => {
    const tick = () => setUptime(diff(new Date()));
    tick();
    const timer = setInterval(tick, 1_000);
    return () => clearInterval(timer);
  }, []);

  return (
    <span className="font-mono text-xs tabular-nums text-fg-faint">
      本站已运行{" "}
      {uptime ? (
        <>
          <span className="text-fg-muted">{uptime.days}</span> 天{" "}
          <span className="text-fg-muted">
            {pad(uptime.hours)}:{pad(uptime.minutes)}:{pad(uptime.seconds)}
          </span>
        </>
      ) : (
        <span className="text-fg-muted">—</span>
      )}
    </span>
  );
}
