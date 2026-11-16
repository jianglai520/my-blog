"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

/** 后台与登录页不上报 */
const SKIP_PREFIXES = ["/admin", "/login"];

/**
 * 全站访客打点：路由变化时上报一次页面路径。
 * - 只上报 pathname，不采集任何个人信息
 * - 服务端按 (日期, 哈希) 去重，刷新不会增加 UV
 * - 自动化浏览器（navigator.webdriver）与爬虫 UA 由两端共同过滤
 */
export default function VisitTracker() {
  const pathname = usePathname();
  const lastPath = useRef("");

  useEffect(() => {
    if (!pathname) return;
    if (SKIP_PREFIXES.some((prefix) => pathname.startsWith(prefix))) return;
    if (typeof navigator !== "undefined" && navigator.webdriver) return;
    // StrictMode 下 effect 会执行两次，这里做一次客户端去重
    if (lastPath.current === pathname) return;
    lastPath.current = pathname;

    const body = JSON.stringify({ path: pathname });
    fetch("/api/visit", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body,
      keepalive: true,
    }).catch(() => {
      // 统计失败不影响页面
    });
  }, [pathname]);

  return null;
}
