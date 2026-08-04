import { describe, it, expect, vi, beforeEach } from "vitest";
import { mapPostTags, groupArchivesByMonth, getPublishedPosts } from "@/lib/posts";

/* ============ mock：unstable_cache 透传 + db 查询 ============ */

const { findManyMock, findFirstMock, whereMock } = vi.hoisted(() => ({
  findManyMock: vi.fn(),
  findFirstMock: vi.fn(),
  whereMock: vi.fn(),
}));

vi.mock("next/cache", () => ({
  // 数据层单测不验证缓存机制，unstable_cache 透传为直接调用
  unstable_cache: (fn: (...args: unknown[]) => unknown) => fn,
}));

vi.mock("@/lib/db", () => ({
  db: {
    query: { posts: { findMany: findManyMock, findFirst: findFirstMock } },
    select: vi.fn(() => ({ from: vi.fn(() => ({ where: whereMock })) })),
  },
}));

/* ============ 测试数据 ============ */

const basePost = {
  id: 1,
  author_id: null,
  slug: "hello",
  title: "你好",
  content: "正文内容",
  excerpt: "摘要",
  cover_image: null,
  status: "published",
  view_count: 10,
  created_at: "2026-08-02T10:00:00Z",
  published: true,
};

/* ============ 纯函数：标签映射 ============ */

describe("mapPostTags", () => {
  it("把嵌套 postTags 映射为 tags 数组", () => {
    const post = {
      ...basePost,
      postTags: [
        { tag: { name: "Next.js", slug: "nextjs" } },
        { tag: { name: "前端", slug: "qian-duan" } },
      ],
    };
    const result = mapPostTags(post);
    expect(result.tags).toEqual([
      { name: "Next.js", slug: "nextjs" },
      { name: "前端", slug: "qian-duan" },
    ]);
    // 原字段保留
    expect(result.title).toBe("你好");
  });

  it("无标签时返回空数组", () => {
    const result = mapPostTags({ ...basePost, postTags: undefined });
    expect(result.tags).toEqual([]);
  });

  it("postTags 为空数组时返回空数组", () => {
    const result = mapPostTags({ ...basePost, postTags: [] });
    expect(result.tags).toEqual([]);
  });
});

/* ============ 纯函数：按年月分组（归档） ============ */

describe("groupArchivesByMonth", () => {
  it("空列表返回空数组", () => {
    expect(groupArchivesByMonth([])).toEqual([]);
  });

  it("同一月份的文章归为一组，保持传入顺序", () => {
    const rows = [
      { id: 1, title: "A", slug: "a", excerpt: null, view_count: 1, created_at: "2026-08-10T00:00:00Z" },
      { id: 2, title: "B", slug: "b", excerpt: null, view_count: 2, created_at: "2026-08-02T00:00:00Z" },
    ];
    const groups = groupArchivesByMonth(rows);
    expect(groups).toHaveLength(1);
    expect(groups[0].year).toBe(2026);
    expect(groups[0].month).toBe(8);
    expect(groups[0].items.map((i) => i.title)).toEqual(["A", "B"]);
  });

  it("跨年跨月分为多组", () => {
    const rows = [
      { id: 3, title: "C", slug: "c", excerpt: null, view_count: 1, created_at: "2026-08-01T00:00:00Z" },
      { id: 2, title: "B", slug: "b", excerpt: null, view_count: 2, created_at: "2026-01-15T00:00:00Z" },
      { id: 1, title: "A", slug: "a", excerpt: null, view_count: 3, created_at: "2025-12-31T00:00:00Z" },
    ];
    const groups = groupArchivesByMonth(rows);
    expect(groups).toHaveLength(3);
    // 月份从 1 开始（非 0-based）
    expect(groups.map((g) => `${g.year}-${g.month}`)).toEqual([
      "2026-8",
      "2026-1",
      "2025-12",
    ]);
  });
});

/* ============ 查询：getPublishedPosts（mock db，验证参数与映射） ============ */

describe("getPublishedPosts", () => {
  beforeEach(() => {
    findManyMock.mockReset();
    whereMock.mockReset();
    findManyMock.mockResolvedValue([
      {
        ...basePost,
        postTags: [{ tag: { name: "Next.js", slug: "nextjs" } }],
      },
    ]);
    whereMock.mockResolvedValue([{ count: 7 }]);
  });

  it("按分页参数查询并解析 total", async () => {
    const result = await getPublishedPosts(2, 5);
    expect(findManyMock).toHaveBeenCalledWith(
      expect.objectContaining({ limit: 5, offset: 5 }),
    );
    expect(whereMock).toHaveBeenCalled();
    expect(result.total).toBe(7);
    expect(result.posts).toHaveLength(1);
  });

  it("首页默认分页（第 1 页，offset 0）", async () => {
    await getPublishedPosts();
    expect(findManyMock).toHaveBeenCalledWith(expect.objectContaining({ limit: 10, offset: 0 }));
  });

  it("结果中的标签被映射为 tags 数组", async () => {
    const result = await getPublishedPosts();
    expect(result.posts[0].tags).toEqual([{ name: "Next.js", slug: "nextjs" }]);
  });
});
