import { describe, it, expect } from "vitest";
import { postSchema } from "@/lib/validations/posts";
import { commentSchema } from "@/lib/validations/comments";
import { credentialsSchema } from "@/lib/validations/auth";
import { avatarDataSchema, replySchema } from "@/lib/validations/replies";

describe("postSchema", () => {
  const base = {
    title: "测试文章",
    slug: "test-post",
    excerpt: "",
    coverImage: "",
    content: "正文内容",
    status: "published",
    tags: "",
  };

  it("合法输入通过", () => {
    const r = postSchema.safeParse(base);
    expect(r.success).toBe(true);
  });

  it("标题为空被拒", () => {
    const r = postSchema.safeParse({ ...base, title: "  " });
    expect(r.success).toBe(false);
  });

  it("内容为空被拒", () => {
    const r = postSchema.safeParse({ ...base, content: "  " });
    expect(r.success).toBe(false);
  });

  it("非法 slug 被拒", () => {
    const r = postSchema.safeParse({ ...base, slug: "Bad Slug!" });
    expect(r.success).toBe(false);
  });

  it("纯数字 slug 被拒（会与 /posts/<id> 链接冲突）", () => {
    const r = postSchema.safeParse({ ...base, slug: "5" });
    expect(r.success).toBe(false);
  });

  it("非法封面 URL 被拒", () => {
    const r = postSchema.safeParse({ ...base, coverImage: "not-a-url" });
    expect(r.success).toBe(false);
  });

  it("非法 status 被拒", () => {
    const r = postSchema.safeParse({ ...base, status: "unknown" });
    expect(r.success).toBe(false);
  });

  it("草稿状态合法", () => {
    const r = postSchema.safeParse({ ...base, status: "draft" });
    expect(r.success).toBe(true);
  });
});

describe("commentSchema", () => {
  const base = {
    postId: "7",
    identifier: "test-post",
    name: "访客",
    content: "写得好！",
  };

  it("合法输入通过（postId 为字符串可 coerce）", () => {
    const r = commentSchema.safeParse(base);
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.postId).toBe(7);
  });

  it("昵称为空被拒", () => {
    const r = commentSchema.safeParse({ ...base, name: " " });
    expect(r.success).toBe(false);
  });

  it("评论超长被拒", () => {
    const r = commentSchema.safeParse({ ...base, content: "x".repeat(1001) });
    expect(r.success).toBe(false);
  });

  it("无效 postId 被拒", () => {
    const r = commentSchema.safeParse({ ...base, postId: "abc" });
    expect(r.success).toBe(false);
  });
});

describe("credentialsSchema", () => {
  const base = { email: "user@example.com", password: "password123" };

  it("合法凭据通过", () => {
    expect(credentialsSchema.safeParse(base).success).toBe(true);
  });

  it("非法邮箱被拒", () => {
    const r = credentialsSchema.safeParse({ ...base, email: "not-an-email" });
    expect(r.success).toBe(false);
  });

  it("密码过短被拒", () => {
    const r = credentialsSchema.safeParse({ ...base, password: "12345" });
    expect(r.success).toBe(false);
  });
});

describe("replySchema", () => {
  const base = {
    targetType: "comment",
    targetId: "33",
    identifier: "33",
    name: "访客",
    avatarData: "",
    content: "回复内容",
  };

  it("合法回复通过", () => {
    expect(replySchema.safeParse(base).success).toBe(true);
  });

  it("目标类型非法被拒", () => {
    expect(replySchema.safeParse({ ...base, targetType: "post" }).success).toBe(false);
  });

  it("内容为空被拒", () => {
    expect(replySchema.safeParse({ ...base, content: "  " }).success).toBe(false);
  });

  it("昵称留空自动变匿名", () => {
    const result = replySchema.safeParse({ ...base, name: "" });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.name).toBe("匿名");
  });
});

describe("avatarDataSchema", () => {
  it("空字符串通过（不上传头像）", () => {
    expect(avatarDataSchema.safeParse("").success).toBe(true);
  });

  it("合法 WebP data URL 通过", () => {
    expect(avatarDataSchema.safeParse("data:image/webp;base64,UklGRg==").success).toBe(true);
  });

  it("非图片 / 脚本被拒", () => {
    expect(avatarDataSchema.safeParse("javascript:alert(1)").success).toBe(false);
    expect(avatarDataSchema.safeParse("data:text/html;base64,PHNjcmlwdD4=").success).toBe(false);
  });

  it("超长数据被拒", () => {
    expect(avatarDataSchema.safeParse(`data:image/webp;base64,${"A".repeat(50_000)}`).success).toBe(false);
  });
});
