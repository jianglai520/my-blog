import { defineConfig } from "drizzle-kit";
import "dotenv/config";

/**
 * drizzle-kit 配置。
 * - generate：基于 db/schema.ts 生成迁移 SQL（输出到 supabase/migrations/drizzle/）
 * - 需要 DATABASE_URL（服务端专用连接串）时才执行 migrate/push
 */
export default defineConfig({
  dialect: "postgresql",
  schema: "./db/schema.ts",
  out: "./supabase/migrations/drizzle",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "",
  },
});
