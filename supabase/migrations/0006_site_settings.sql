-- ============================================================
-- 0006_site_settings.sql — 站点配置表（个人信息可后台随时修改）
-- 执行方式：Supabase 控制台 → SQL Editor 粘贴执行（幂等，可重复执行）
-- ============================================================

create table if not exists public.site_settings (
  key        text primary key,
  value      text not null default '',
  updated_at timestamptz not null default now()
);

-- 默认值 seed（管理员可在后台覆盖）
insert into public.site_settings (key, value) values
  ('author_name', '江来'),
  ('intro', '全栈学习者 & 生活记录者'),
  ('bio', '你好，欢迎来到我的博客。这里记录技术实践、学习笔记与生活随想。'),
  ('github', ''),
  ('email', ''),
  ('avatar_url', ''),
  ('icp', '')
on conflict (key) do nothing;

-- RLS：公开读；仅博主写
alter table public.site_settings enable row level security;

drop policy if exists "site_settings_select_public" on public.site_settings;
create policy "site_settings_select_public" on public.site_settings
  for select using (true);

drop policy if exists "site_settings_write_admin" on public.site_settings;
create policy "site_settings_write_admin" on public.site_settings
  for all using (public.is_admin()) with check (public.is_admin());

grant select on public.site_settings to anon, authenticated;
grant insert, update, delete on public.site_settings to authenticated;
