import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import PostCard from "@/app/components/PostCard";

// 测试替身：用原生 img 替代 next/image（next/no-img-element 规则仅针对生产代码）
/* eslint-disable @next/next/no-img-element */
vi.mock("next/image", () => ({
  default: (props: { src: string; alt: string }) => <img src={props.src} alt={props.alt} />,
}));
/* eslint-enable @next/next/no-img-element */
vi.mock("next/link", () => ({
  default: ({ href, children }: { href: string; children: ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));

const basePost = {
  id: 1,
  slug: "hello",
  title: "你好，世界",
  content: "这是一段正文内容，用于摘要兜底。",
  excerpt: "手动摘要",
  cover_image: null,
  status: "published",
  view_count: 10,
  created_at: "2026-08-02T10:00:00Z",
  tags: [{ name: "Next.js", slug: "nextjs" }],
} as const;

describe("PostCard 文章卡片", () => {
  it("渲染标题 / 摘要 / 阅读数 / 标签 / 日期", () => {
    render(<PostCard post={{ ...basePost, view_count: 42 }} />);

    expect(screen.getByText("你好，世界")).toBeInTheDocument();
    expect(screen.getByText("手动摘要")).toBeInTheDocument();
    expect(screen.getByText("#Next.js")).toBeInTheDocument();
    expect(screen.getByLabelText("阅读数")).toHaveTextContent("42");
  });

  it("链接指向 slug 路径", () => {
    render(<PostCard post={basePost} />);
    const link = screen.getByRole("link", { name: "你好，世界" });
    expect(link).toHaveAttribute("href", "/posts/hello");
  });

  it("无封面图时不渲染图片，有封面图时渲染 alt 为标题", () => {
    const { container } = render(<PostCard post={basePost} />);
    expect(container.querySelector("img")).toBeNull();

    render(<PostCard post={{ ...basePost, cover_image: "/cover.jpg" }} />);
    expect(screen.getAllByAltText("你好，世界").length).toBeGreaterThan(0);
  });

  it("无摘要时用正文截断兜底", () => {
    render(<PostCard post={{ ...basePost, excerpt: "" }} />);
    expect(screen.getByText(/这是一段正文内容/)).toBeInTheDocument();
  });

  it("阅读数为 0 时不显示阅读数", () => {
    render(<PostCard post={{ ...basePost, view_count: 0 }} />);
    expect(screen.queryByLabelText("阅读数")).toBeNull();
  });
});
