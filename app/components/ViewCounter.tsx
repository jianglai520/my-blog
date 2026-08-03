"use client";

import { useEffect, useRef, useState } from "react";
import { incrementView } from "@/app/actions/views";

/**
 * 文章浏览量计数器（客户端）：
 * 每次打开文章页都 +1（博主选择「每次访问都 +1」，无防刷）。
 * calledRef 防止 React StrictMode 下 effect 双调用导致的重复计数。
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

    incrementView(postId).then((n) => {
      if (typeof n === "number") setCount(n);
    });
  }, [postId]);

  return <span aria-label="阅读数">👁 {count}</span>;
}
