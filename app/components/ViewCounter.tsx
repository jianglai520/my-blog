"use client";

import { useEffect, useRef, useState } from "react";
import { incrementView } from "@/app/actions/views";

/**
 * 文章浏览量计数器（客户端）：
 * 服务端按「同一访客（IP 哈希）每天每篇一次」去重，刷新不会重复计数。
 * calledRef 防止 React StrictMode 下 effect 双调用导致的重复请求。
 */
export default function ViewCounter({
  postId,
  initialCount,
}: {
  postId: number;
  initialCount: number;
}) {
  const [count, setCount] = useState(initialCount);
  const calledRef = useRef(false);

  useEffect(() => {
    if (calledRef.current) return;
    calledRef.current = true;
    // 自动化浏览器不计数（与访客统计保持一致）
    if (typeof navigator !== "undefined" && navigator.webdriver) return;

    incrementView(postId).then((n) => {
      if (typeof n === "number") setCount(n);
    });
  }, [postId]);

  return <span aria-label="阅读数">👁 {count}</span>;
}
