import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "@/db/schema";

/**
 * Drizzle 数据库客户端（仅服务端读路径使用）。
 * - 连接串来自 DATABASE_URL（服务端专用环境变量，绝不带 NEXT_PUBLIC_ 前缀）
 * - serverless 下用 globalThis 缓存连接池，避免每次请求新建连接
 *
 * ⚠️ 安全约定：本客户端直连数据库（绕过 RLS），
 *    只能用于「公开读」查询（查询条件必须显式过滤 status='published'）；
 *    所有写操作继续走 supabase-js 服务端客户端（RLS 防线）。
 */
const globalForDb = globalThis as unknown as {
  pg: ReturnType<typeof postgres> | undefined;
};

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("缺少 DATABASE_URL 环境变量（Phase 2 数据库连接串，见 .env.example）");
}

const client =
  globalForDb.pg ??
  postgres(connectionString, {
    max: 5, // 连接池上限，防 serverless 连接泄漏
    connect_timeout: 10,
  });

if (process.env.NODE_ENV !== "production") globalForDb.pg = client;

export const db = drizzle(client, { schema });
