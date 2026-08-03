import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "@/db/schema";

/**
 * Drizzle 数据库客户端（仅服务端读路径使用）。
 * - 连接串来自 DATABASE_URL（服务端专用环境变量，绝不带 NEXT_PUBLIC_ 前缀）
 * - 驱动：node-postgres（pg）——postgres-js 与 drizzle 0.45 存在会话层并发死锁，已弃用
 * - globalThis 缓存连接池（生产模式也必须复用，否则每请求新建连接池，并发下连接爆炸）
 *
 * ⚠️ 安全约定：本客户端直连数据库（绕过 RLS），
 *    只能用于「公开读」查询（查询条件必须显式过滤 status='published'）；
 *    所有写操作继续走 supabase-js 服务端客户端（RLS 防线）。
 */
const globalForDb = globalThis as unknown as {
  pool: Pool | undefined;
};

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("缺少 DATABASE_URL 环境变量（Phase 2 数据库连接串，见 .env.example）");
}

const pool =
  globalForDb.pool ??
  new Pool({
    connectionString,
    max: 5,
    connectionTimeoutMillis: 10_000,
    idleTimeoutMillis: 30_000,
  });

// 无条件缓存：生产模式也必须复用连接池
globalForDb.pool = pool;

export const db = drizzle(pool, { schema });
