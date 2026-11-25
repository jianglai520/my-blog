/** 上传图片的最长边：网页正文最大显示约 768px，2x 屏也只需 1536px */
export const IMAGE_MAX_DIMENSION = 1600;

export type Dimensions = { width: number; height: number };

/**
 * 等比缩放到最长边 ≤ max，不放大。
 * 纯函数，便于单测与复用（浏览器压缩、服务端处理）。
 */
export function targetDimensions(
  width: number,
  height: number,
  max = IMAGE_MAX_DIMENSION,
): Dimensions {
  const largest = Math.max(width, height);
  if (!Number.isFinite(largest) || largest <= max) {
    return { width: Math.max(1, Math.round(width)), height: Math.max(1, Math.round(height)) };
  }

  const scale = max / largest;
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}
