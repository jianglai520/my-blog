import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { errorMessage, logger } from "@/lib/logger";

let logSpy: ReturnType<typeof vi.spyOn>;
let warnSpy: ReturnType<typeof vi.spyOn>;
let errorSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
  warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
  errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

function parseArg(spy: ReturnType<typeof vi.spyOn>): Record<string, unknown> {
  return JSON.parse(String(spy.mock.calls[0][0]));
}

describe("logger 结构化日志", () => {
  it("info 输出单行 JSON 并带上下文", () => {
    logger.info("请求完成", { route: "/api/health", ms: 12 });

    const entry = parseArg(logSpy);
    expect(entry).toMatchObject({
      level: "info",
      msg: "请求完成",
      route: "/api/health",
      ms: 12,
    });
    expect(typeof entry.time).toBe("string");
  });

  it("warn 输出到 console.warn", () => {
    logger.warn("慢请求");
    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(parseArg(warnSpy)).toMatchObject({ level: "warn", msg: "慢请求" });
  });

  it("Error 会被归一化为 error 字段", () => {
    logger.error("失败", new Error("kaboom"));
    expect(parseArg(errorSpy).error).toBe("kaboom");
  });

  it("字符串上下文放入 detail", () => {
    logger.error("失败", "some detail");
    expect(parseArg(errorSpy).detail).toBe("some detail");
  });
});

describe("errorMessage", () => {
  it("处理 Error / 字符串 / 对象", () => {
    expect(errorMessage(new Error("x"))).toBe("x");
    expect(errorMessage("y")).toBe("y");
    expect(errorMessage({ code: 1 })).toBe('{"code":1}');
  });
});
