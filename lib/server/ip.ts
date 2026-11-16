import "server-only";
import { createHash } from "node:crypto";

type HeaderReader = { get(name: string): string | null };

/**
 * 取客户端 IP。
 * Vercel 会写入 `x-real-ip`，优先使用；其余环境退回 `x-forwarded-for`。
 */
export function getClientIp(headers: HeaderReader): string {
  return (
    headers.get("x-real-ip")?.trim() ||
    headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "unknown"
  );
}

/**
 * 不可逆的 IP 标识：限流与去重只需要“同一 IP 得到同一值”，
 * 不需要保存明文 IP。盐复用 VISIT_HASH_SALT（也可单独配 IP_HASH_SALT）。
 */
export function hashIp(ip: string): string {
  const salt =
    process.env.IP_HASH_SALT ||
    process.env.VISIT_HASH_SALT ||
    "jianglai520-ip-salt";
  return createHash("sha256").update(`${ip}|${salt}`).digest("hex");
}
