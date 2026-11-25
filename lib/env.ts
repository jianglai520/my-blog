/**
 * 环境变量集中校验：缺失或格式错误时立刻抛错，错误信息包含变量名。
 *
 * - `getPublicEnv()`：Supabase 公开变量，服务端 / Edge（proxy.ts）都可使用
 * - `getServerEnv()`：数据库连接串，仅 Node.js 服务端使用
 *
 * 注意：浏览器端仍需直接写 `process.env.NEXT_PUBLIC_*`（Next 在构建期做字面量替换），
 * 不要在客户端组件里 import 本模块。
 */

export type PublicEnv = {
  supabaseUrl: string;
  supabaseAnonKey: string;
};

export type ServerEnv = {
  databaseUrl: string;
};

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `缺少环境变量 ${name}，请检查本地 .env.local 或 Vercel → Settings → Environment Variables`
    );
  }
  return value;
}

function requiredUrl(name: string): string {
  const value = required(name);
  try {
    new URL(value);
  } catch {
    throw new Error(`环境变量 ${name} 不是合法 URL：${value}`);
  }
  return value;
}

let publicCache: PublicEnv | null = null;

export function getPublicEnv(): PublicEnv {
  publicCache ??= {
    supabaseUrl: requiredUrl("NEXT_PUBLIC_SUPABASE_URL"),
    supabaseAnonKey: required("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
  };
  return publicCache;
}

let serverCache: ServerEnv | null = null;

export function getServerEnv(): ServerEnv {
  serverCache ??= {
    databaseUrl: required("DATABASE_URL"),
  };
  return serverCache;
}
