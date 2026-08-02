"use client";

import { useEffect, useRef, useState } from "react";
import { incrementView } from "@/app/actions/views";

/**
 * 文章浏览量计数器（客户端）：
 * 挂载时检查 cookie，本篇文章当日未计过则调用 incrementView 并种 cookie 防刷。
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

    const cookieName = `viewed_${postId}`;
    const already = document.cookie
      .split("; ")
      .some((c) => c.startsWith(`${cookieName}=`));
    if (already) return;

    incrementView(postId).then((n) => {
      if (typeof n === "number") {
        setCount(n);
        // 24 小时后过期，允许再次计数
        document.cookie = `${cookieName}=1; path=/; max-age=86400`;
      }
    });
  }, [postId]);

  return <span aria-label="阅读数">👁 {count}</span>;
}
