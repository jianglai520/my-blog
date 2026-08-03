import { ImageResponse } from "@vercel/og";

export const runtime = "edge";

/**
 * 动态 OpenGraph 分享图（1200×630）：
 * 按文章标题生成品牌风分享卡片，供微信/社交/爬虫抓取。
 * 标题走 query（edge 运行时无法查数据库）。
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const rawTitle = searchParams.get("title") ?? "jianglai520";
  // 标题过长时截断（中英文混合按长度估算）
  const title = rawTitle.length > 24 ? `${rawTitle.slice(0, 24)}…` : rawTitle;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #0b0b18 0%, #1b0b33 60%, #2a1550 100%)",
          padding: "72px 96px",
          position: "relative",
        }}
      >
        {/* 顶部渐变线 */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: 6,
            background: "linear-gradient(90deg, transparent, #a855f7, #c084fc, #a855f7, transparent)",
          }}
        />
        {/* 品牌标记 */}
        <div
          style={{
            display: "flex",
            width: 88,
            height: 88,
            borderRadius: 22,
            background: "linear-gradient(135deg, #8b5cf6, #a855f7)",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 48,
            fontWeight: 700,
            color: "#fff",
            marginBottom: 40,
          }}
        >
          J
        </div>
        {/* 标题 */}
        <div
          style={{
            color: "#e7e7f2",
            fontSize: title.length > 16 ? 52 : 64,
            fontWeight: 700,
            textAlign: "center",
            lineHeight: 1.3,
            letterSpacing: 1,
          }}
        >
          {title}
        </div>
        {/* 站点名 */}
        <div
          style={{
            color: "#9b9bb3",
            fontSize: 26,
            marginTop: 32,
            letterSpacing: 2,
          }}
        >
          jianglai520 · 我的博客
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  );
}
