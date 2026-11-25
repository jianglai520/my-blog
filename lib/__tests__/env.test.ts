import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

const REQUIRED = [
  "DATABASE_URL",
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
] as const;

const original: Record<string, string | undefined> = {};
for (const key of REQUIRED) original[key] = process.env[key];

beforeEach(() => {
  vi.resetModules();
  process.env.DATABASE_URL = "postgresql://user:pass@localhost:5432/db";
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon-key";
});

afterEach(() => {
  for (const key of REQUIRED) {
    if (original[key] === undefined) delete process.env[key];
    else process.env[key] = original[key];
  }
});

describe("环境变量校验", () => {
  it("合法配置返回解析结果", async () => {
    const { getServerEnv, getPublicEnv } = await import("@/lib/env");
    expect(getServerEnv().databaseUrl).toContain("postgresql://");
    expect(getPublicEnv().supabaseUrl).toBe("https://example.supabase.co");
    expect(getPublicEnv().supabaseAnonKey).toBe("anon-key");
  });

  it("缺少 DATABASE_URL 时抛错并带上变量名", async () => {
    delete process.env.DATABASE_URL;
    const { getServerEnv } = await import("@/lib/env");
    expect(() => getServerEnv()).toThrow(/DATABASE_URL/);
  });

  it("缺少 Supabase 变量时抛错", async () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const { getPublicEnv } = await import("@/lib/env");
    expect(() => getPublicEnv()).toThrow(/NEXT_PUBLIC_SUPABASE_ANON_KEY/);
  });

  it("URL 格式错误时抛错", async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "not-a-url";
    const { getPublicEnv } = await import("@/lib/env");
    expect(() => getPublicEnv()).toThrow(/合法 URL/);
  });
});
