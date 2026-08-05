import { describe, it, expect, vi, beforeEach } from "vitest";

// mock 服务端依赖（不触发真实数据库/网络）
vi.mock("@/lib/server/supabase", () => ({
  getServerSupabase: vi.fn(),
  requireAdmin: vi.fn(),
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn(), updateTag: vi.fn() }));
vi.mock("@/lib/rag", () => ({
  syncPostChunks: vi.fn(),
  deletePostChunks: vi.fn(),
}));

import { getServerSupabase, requireAdmin } from "@/lib/server/supabase";
import { createPost, updatePost } from "@/app/actions/posts";

const mockedRequireAdmin = vi.mocked(requireAdmin);
const mockedGetServerSupabase = vi.mocked(getServerSupabase);

/** 构造 supabase-js 链式查询 mock（返回成功空结果） */
function buildSupabaseMock() {
  const chain: Record<string, ReturnType<typeof vi.fn>> = {};
  chain.insert = vi.fn(() => chain);
  chain.select = vi.fn(() => chain);
  chain.single = vi.fn().mockResolvedValue({ data: { id: 99 }, error: null });
  chain.update = vi.fn(() => chain);
  chain.eq = vi.fn(() => chain);
  chain.maybeSingle = vi.fn().mockResolvedValue({ data: null, error: null });
  chain.delete = vi.fn(() => chain);
  chain.in = vi.fn(() => chain);
  chain.upsert = vi.fn().mockResolvedValue({ data: null, error: null });
  chain.order = vi.fn(() => chain);

  const from = vi.fn(() => chain);
  mockedGetServerSupabase.mockResolvedValue({ from } as never);
  return chain;
}

function makeFormData(overrides: Record<string, string> = {}): FormData {
  const fd = new FormData();
  const base: Record<string, string> = {
    title: "测试文章",
    slug: "test-post",
    excerpt: "",
    coverImage: "",
    content: "正文内容",
    status: "published",
    tags: "",
    ...overrides,
  };
  for (const [k, v] of Object.entries(base)) fd.set(k, v);
  return fd;
}

describe("createPost 权限与校验分支", () => {
  beforeEach(() => {
    // resetAllMocks：清除实现与一次性队列，防止测试间状态泄漏
    vi.resetAllMocks();
  });

  it("未登录（requireAdmin 抛错）→ 返回无权限消息", async () => {
    mockedRequireAdmin.mockRejectedValueOnce(new Error("请先登录"));
    const state = await createPost({ message: "", success: false }, makeFormData());
    expect(state.success).toBe(false);
    expect(state.message).toContain("请先登录");
  });

  it("非博主 → 拒绝执行", async () => {
    mockedRequireAdmin.mockRejectedValueOnce(new Error("仅博主可执行此操作"));
    const state = await createPost({ message: "", success: false }, makeFormData());
    expect(state.success).toBe(false);
    expect(state.message).toContain("仅博主");
  });

  it("内容为空 → 校验失败", async () => {
    mockedRequireAdmin.mockResolvedValueOnce({ id: "u1", email: "a@b.c" } as never);
    const state = await createPost(
      { message: "", success: false },
      makeFormData({ content: "  " }),
    );
    expect(state.success).toBe(false);
    expect(state.message).toContain("内容不能为空");
  });

  it("标题为空 → 校验失败", async () => {
    mockedRequireAdmin.mockResolvedValueOnce({ id: "u1", email: "a@b.c" } as never);
    const state = await createPost(
      { message: "", success: false },
      makeFormData({ title: " " }),
    );
    expect(state.success).toBe(false);
    expect(state.message).toContain("标题不能为空");
  });

  it("合法输入 → 发布成功并写库", async () => {
    mockedRequireAdmin.mockResolvedValueOnce({ id: "u1", email: "a@b.c" } as never);
    const chain = buildSupabaseMock();
    const state = await createPost({ message: "", success: false }, makeFormData());

    expect(state.success).toBe(true);
    expect(state.message).toContain("发布成功");
    // 确认调用了 posts.insert
    expect(chain.insert).toHaveBeenCalled();
  });

  it("发布为草稿 → 提示草稿已保存", async () => {
    mockedRequireAdmin.mockResolvedValueOnce({ id: "u1", email: "a@b.c" } as never);
    buildSupabaseMock();
    const state = await createPost(
      { message: "", success: false },
      makeFormData({ status: "draft" }),
    );
    expect(state.success).toBe(true);
    expect(state.message).toContain("草稿已保存");
  });
});

describe("updatePost 权限与校验分支", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("缺少 postId → 拒绝", async () => {
    const fd = makeFormData();
    const state = await updatePost({ message: "", success: false }, fd);
    expect(state.success).toBe(false);
    expect(state.message).toContain("文章 ID 不合法");
  });

  it("非博主 → 拒绝", async () => {
    mockedRequireAdmin.mockRejectedValueOnce(new Error("仅博主可执行此操作"));
    const fd = makeFormData({ postId: "7" });
    const state = await updatePost({ message: "", success: false }, fd);
    expect(state.success).toBe(false);
    expect(state.message).toContain("仅博主");
  });

  it("合法输入 → 更新成功", async () => {
    mockedRequireAdmin.mockResolvedValueOnce({ id: "u1", email: "a@b.c" } as never);
    const chain = buildSupabaseMock();
    // update 的 select().maybeSingle() 返回更新的行
    chain.maybeSingle.mockResolvedValueOnce({ data: { slug: "test-post", status: "published" }, error: null });
    const fd = makeFormData({ postId: "7" });
    const state = await updatePost({ message: "", success: false }, fd);
    expect(state.success).toBe(true);
    expect(chain.update).toHaveBeenCalled();
  });
});
