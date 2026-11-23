"use client";

import dynamic from "next/dynamic";

/**
 * 文章页的纯客户端交互组件，懒加载（不参与 SSR）。
 * - 这些组件都是「挂载后才有行为」的增强层（目录、灯箱、AI 入口），
 *   放进主包只会拖慢首屏，拆成独立 chunk 后按需加载。
 * - 文章正文本身仍是服务端渲染，不受影响。
 */
export const Toc = dynamic(() => import("./Toc"), { ssr: false });

export const ImageLightbox = dynamic(() => import("./ImageLightbox"), {
  ssr: false,
});

export const AIChatButton = dynamic(() => import("./AIChatButton"), {
  ssr: false,
});
