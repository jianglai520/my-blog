-- ============================================================
-- 0004_phase2.sql — Phase 2：profiles 自建行 RPC + 提权漏洞收紧
-- 执行方式：Supabase 控制台 → SQL Editor 粘贴执行（幂等，可重复执行）
-- ============================================================

-- ---------- 1. profiles 自建行 RPC（登录时调用） ----------
-- security definer 以函数属主权限执行、绕过 RLS：
-- 登录用户只能为自己创建 is_admin=false 的行，无法提权、无法改他人。
create or replace function public.ensure_profile()
returns void
language sql
security definer
set search_path = public
as $$
  insert into public.profiles (id, is_admin)
  values (auth.uid(), false)
  on conflict (id) do nothing;
$$;

grant execute on function public.ensure_profile() to anon, authenticated;

-- ---------- 2. 安全收紧：移除 profiles_update_self ----------
-- 原策略允许用户 update 自己的行（with check 仅校验 auth.uid()=id），
-- 存在把 is_admin 改成 true 的提权漏洞；当前无资料编辑功能，直接移除最安全。
drop policy if exists "profiles_update_self" on public.profiles;
