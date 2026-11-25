import Image from "next/image";

/**
 * 评论 / 留言头像。
 *
 * - 有上传头像：显示真实图片（访客是 96×96 WebP data URL，博主是站点头像）
 * - 没有头像：昵称首字 + 由昵称哈希生成的双色渐变（同一昵称始终同色）
 *
 * 纯服务端可渲染：哈希与颜色都是确定性的，不会出现 hydration mismatch。
 * 头像属于装饰元素，外层 aria-hidden，昵称本身仍是可读文本。
 */

const FNV_OFFSET = 2166136261;

function hashName(name: string): number {
  let hash = FNV_OFFSET;
  for (let i = 0; i < name.length; i++) {
    hash ^= name.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function palette(seed: number) {
  const h1 = seed % 360;
  const h2 = (h1 + 38 + (seed % 20)) % 360;
  return {
    from: `hsl(${h1} 58% 48%)`,
    to: `hsl(${h2} 68% 42%)`,
  };
}

export default function Avatar({
  name,
  size = 40,
  avatarUrl = "",
  className = "",
}: {
  name: string;
  size?: number;
  avatarUrl?: string;
  className?: string;
}) {
  const safeName = name.trim() || "匿名";
  const seed = hashName(safeName);
  const { from, to } = palette(seed);
  const initial = Array.from(safeName)[0] ?? "匿";
  const showPhoto = Boolean(avatarUrl);

  return (
    <span
      className={`relative inline-flex shrink-0 ${className}`}
      style={{ width: size, height: size }}
      data-avatar={showPhoto ? "photo" : "initial"}
      aria-hidden="true"
    >
      <span className="flex h-full w-full items-center justify-center overflow-hidden rounded-full">
        {showPhoto ? (
          <Image
            src={avatarUrl}
            alt=""
            width={size}
            height={size}
            className="h-full w-full rounded-full object-cover"
          />
        ) : (
          <span
            className="flex h-full w-full items-center justify-center rounded-full font-semibold text-white"
            style={{
              background: `linear-gradient(135deg, ${from}, ${to})`,
              fontSize: Math.round(size * 0.42),
            }}
          >
            {initial}
          </span>
        )}
      </span>
    </span>
  );
}
