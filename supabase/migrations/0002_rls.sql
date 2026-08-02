-- ============================================================
-- 0002_rls.sql — 行级安全策略（幂等，可重复执行）
-- 执行方式：Supabase 控制台 → SQL Editor 粘贴执行（需先执行 0001_init.sql）
--
-- 安全模型：
--   · posts  ：任何人可读已发布文章；仅博主（profiles.is_admin=true）可增删改
--   · comments：任何人可读、可匿名发表；仅博主可删除
--   · profiles：本人可读/改自己的资料；博主可读全部
--
-- ⚠️ 重要：判断「是否博主」统一走 security definer 函数 public.is_admin()。
--    不要在策略里直接写 `auth.uid() in (select id from profiles ...)`——
--    策略子查询引用带 RLS 的表自身会触发 PostgreSQL 无限递归（错误 42P17）。
-- ============================================================

-- ---------- 博主判断函数（security definer 绕过 RLS，避免递归） ----------
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and is_admin = true
  );
$$;

-- ---------- 开启 RLS（重复执行无害） ----------
alter table public.posts enable row level security;
alter table public.comments enable row level security;
alter table public.profiles enable row level security;

-- ---------- posts ----------
drop policy if exists "posts_select_public" on public.posts;
create policy "posts_select_public" on public.posts
  for select using (published = true);

drop policy if exists "posts_select_admin" on public.posts;
create policy "posts_select_admin" on public.posts
  for select using (public.is_admin());

drop policy if exists "posts_write_admin" on public.posts;
create policy "posts_write_admin" on public.posts
  for all
  using (public.is_admin())
  with check (public.is_admin());

-- ---------- comments ----------
drop policy if exists "comments_select_public" on public.comments;
create policy "comments_select_public" on public.comments
  for select using (true);

-- 匿名可发表评论（与现状行为一致；垃圾评论防护见后续 Phase）
drop policy if exists "comments_insert_public" on public.comments;
create policy "comments_insert_public" on public.comments
  for insert with check (true);

drop policy if exists "comments_delete_admin" on public.comments;
create policy "comments_delete_admin" on public.comments
  for delete using (public.is_admin());

-- ---------- profiles ----------
drop policy if exists "profiles_select_self" on public.profiles;
create policy "profiles_select_self" on public.profiles
  for select using (auth.uid() = id);

drop policy if exists "profiles_select_admin" on public.profiles;
create policy "profiles_select_admin" on public.profiles
  for select using (public.is_admin());

drop policy if exists "profiles_update_self" on public.profiles;
create policy "profiles_update_self" on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);
