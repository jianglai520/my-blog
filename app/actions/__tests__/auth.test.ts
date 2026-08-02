import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/server/supabase", () => ({
  getServerSupabase: vi.fn(),
}));
vi.mock("next/navigation", () => ({
  redirect: vi.fn(() => {
    throw new Error("NEXT_REDIRECT");
  }),
}));

import { getServerSupabase } from "@/lib/server/supabase";
import { login, signup } from "@/app/actions/auth";

const mockedGetServerSupabase = vi.mocked(getServerSupabase);

function makeFormData(email: string, password: string): FormData {
  const fd = new FormData();
  fd.set("email", email);
  fd.set("password", password);
  return fd;
}

describe("login 校验与权限分支", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("非法邮箱 → 校验失败，不调 Supabase", async () => {
    const state = await login({ message: "", success: false }, makeFormData("bad", "password123"));
    expect(state.success).toBe(false);
    expect(state.message).toContain("邮箱");
    expect(mockedGetServerSupabase).not.toHaveBeenCalled();
  });

  it("密码过短 → 校验失败", async () => {
    const state = await login(
      { message: "", success: false },
      makeFormData("user@example.com", "123"),
    );
    expect(state.success).toBe(false);
    expect(mockedGetServerSupabase).not.toHaveBeenCalled();
  });

  it("凭据错误 → 登录失败消息", async () => {
    mockedGetServerSupabase.mockResolvedValueOnce({
      auth: {
        signInWithPassword: vi.fn().mockResolvedValue({
          data: { user: null, session: null },
          error: { message: "Invalid login credentials" },
        }),
      },
    } as never);
    const state = await login(
      { message: "", success: false },
      makeFormData("user@example.com", "password123"),
    );
    expect(state.success).toBe(false);
    expect(state.message).toContain("登录失败");
  });
});

describe("signup 校验分支", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("非法邮箱 → 校验失败", async () => {
    const state = await signup({ message: "", success: false }, makeFormData("bad", "password123"));
    expect(state.success).toBe(false);
  });

  it("密码过短 → 校验失败", async () => {
    const state = await signup(
      { message: "", success: false },
      makeFormData("user@example.com", "12345"),
    );
    expect(state.success).toBe(false);
    expect(mockedGetServerSupabase).not.toHaveBeenCalled();
  });
});
