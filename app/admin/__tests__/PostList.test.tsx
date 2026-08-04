import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import PostList from "@/app/admin/PostList";
import type { AdminPost } from "@/app/admin/shared";

// Server Action 不真实执行，仅验证渲染与回调
vi.mock("@/app/actions/posts", () => ({
  deletePost: vi.fn(),
  batchDeletePosts: vi.fn(),
}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));

const basePost = {
  author_id: null,
  title: "",
  content: "",
  excerpt: "",
  cover_image: null,
  view_count: 0,
  published: true,
  created_at: "2026-08-02T10:00:00Z",
};

const posts: AdminPost[] = [
  {
    ...basePost,
    id: 1,
    slug: "a",
    title: "已发布文章",
    status: "published",
    post_tags: [{ tag: { name: "前端" } }],
  },
  {
    ...basePost,
    id: 2,
    slug: null,
    title: "草稿文章",
    status: "draft",
    post_tags: undefined,
  },
];

describe("PostList 文章管理列表", () => {
  it("渲染文章标题、草稿标记与标签", () => {
    render(<PostList posts={posts} onEdit={vi.fn()} />);

    expect(screen.getByText("已发布文章")).toBeInTheDocument();
    expect(screen.getByText("草稿文章")).toBeInTheDocument();
    expect(screen.getByText("草稿")).toBeInTheDocument();
    expect(screen.getByText("#前端")).toBeInTheDocument();
  });

  it("草稿文章链接用 id 兜底，已发布用 slug", () => {
    render(<PostList posts={posts} onEdit={vi.fn()} />);
    expect(screen.getByRole("link", { name: "草稿文章" })).toHaveAttribute(
      "href",
      "/posts/2",
    );
    expect(screen.getByRole("link", { name: "已发布文章" })).toHaveAttribute(
      "href",
      "/posts/a",
    );
  });

  it("点击编辑回调传入对应文章", async () => {
    const onEdit = vi.fn();
    render(<PostList posts={posts} onEdit={onEdit} />);

    await userEvent.click(screen.getAllByRole("button", { name: "编辑" })[0]);
    expect(onEdit).toHaveBeenCalledWith(posts[0]);
  });

  it("空列表显示提示", () => {
    render(<PostList posts={[]} onEdit={vi.fn()} />);
    expect(screen.getByText("还没有文章～")).toBeInTheDocument();
  });
});
