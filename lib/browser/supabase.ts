"use client";

import { createBrowserClient } from "@supabase/ssr";

/**
 * 浏览器端 Supabase 客户端（cookie session，自动带登录态）。
 * 用于 Storage 直传等需要登录凭证的客户端操作；
 * RLS 策略（post_images_admin_insert）保证仅博主可上传。
 * 注意：此文件仅供客户端组件使用。
 */
export function getBrowserSupabase() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
