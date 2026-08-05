import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import CommentForm from "@/app/posts/[identifier]/CommentForm";

const { createCommentMock } = vi.hoisted(() => ({ createCommentMock: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
vi.mock("@/app/actions/comments", () => ({ createComment: createCommentMock }));

describe("CommentForm 评论表单", () => {
  beforeEach(() => {
    createCommentMock.mockReset();
    createCommentMock.mockResolvedValue({ message: "", success: true });
  });

  it("渲染昵称/内容输入框与发布按钮", () => {
    render(<CommentForm postId={7} identifier="7" />);
    expect(screen.getByLabelText("昵称")).toBeInTheDocument();
    expect(screen.getByLabelText("内容")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "发布评论" })).toBeInTheDocument();
  });

  it("隐藏字段携带 postId 与 identifier", () => {
    render(<CommentForm postId={7} identifier="my-post" />);
    expect(screen.getByDisplayValue("7")).toBeInTheDocument(); // postId hidden input
    expect(screen.getByDisplayValue("my-post")).toBeInTheDocument(); // identifier hidden input
  });

  it("填写并提交后调用 createComment", async () => {
    const user = userEvent.setup();
    render(<CommentForm postId={7} identifier="7" />);

    await user.type(screen.getByLabelText("昵称"), "测试用户");
    await user.type(screen.getByLabelText("内容"), "这是一条测试评论");
    await user.click(screen.getByRole("button", { name: "发布评论" }));

    expect(createCommentMock).toHaveBeenCalled();
  });

  it("未填写直接提交也会触发（服务端校验兜底）", async () => {
    const user = userEvent.setup();
    render(<CommentForm postId={7} identifier="7" />);
    await user.click(screen.getByRole("button", { name: "发布评论" }));
    expect(createCommentMock).toHaveBeenCalled();
  });
});
