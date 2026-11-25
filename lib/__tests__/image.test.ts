import { describe, it, expect } from "vitest";
import { targetDimensions, IMAGE_MAX_DIMENSION } from "@/lib/image";

describe("targetDimensions 图片缩放", () => {
  it("超过最长边时等比缩小", () => {
    expect(targetDimensions(1920, 1280)).toEqual({ width: 1600, height: 1067 });
  });

  it("小图不放大", () => {
    expect(targetDimensions(800, 600)).toEqual({ width: 800, height: 600 });
  });

  it("竖图按高度限制", () => {
    expect(targetDimensions(1280, 1920)).toEqual({ width: 1067, height: 1600 });
  });

  it("支持自定义最长边", () => {
    expect(targetDimensions(1600, 400, 800)).toEqual({ width: 800, height: 200 });
  });

  it("默认最长边为 1600", () => {
    expect(IMAGE_MAX_DIMENSION).toBe(1600);
  });
});
