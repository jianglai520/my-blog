-- ============================================================
-- 0003_markdown_draft.sql — Markdown 内容系统 + 草稿状态 + 图片存储
-- 执行方式：Supabase 控制台 → SQL Editor 粘贴执行（幂等，可重复执行）
-- 前置：0001_init.sql、0002_rls.sql 已执行（依赖 profiles 表与 public.is_admin() 函数）
-- ============================================================

-- ---------- 1. posts 增加 status 列（draft / published） ----------
alter table public.posts add column if not exists status text not null default 'published';

-- 存量数据同步：published 布尔值 → status 文本值（幂等，可重复跑）
update public.posts
set status = case when published then 'published' else 'draft' end;

-- ---------- 2. 旧正文迁移：纯文本单换行 → Markdown 段落（双换行） ----------
-- 先统一换行为 \n，再把「前后都不是换行」的单换行替换为双换行（空行 = 段落）
update public.posts set content = replace(content, E'\r\n', E'\n');
update public.posts
set content = regexp_replace(content, E'([^\n])\n([^\n])', E'\\1\n\n\\2', 'g');

-- ---------- 3. RLS 更新：草稿永不公开（原策略按 published=true，现按 status） ----------
drop policy if exists "posts_select_public" on public.posts;
create policy "posts_select_public" on public.posts
  for select using (status = 'published');

-- ---------- 4. 图片存储 bucket：post-images（public，图片公开可访问） ----------
insert into storage.buckets (id, name, public)
values ('post-images', 'post-images', true)
on conflict (id) do nothing;

-- storage.objects 策略：公开读；仅博主可上传/删除
drop policy if exists "post_images_public_read" on storage.objects;
create policy "post_images_public_read" on storage.objects
  for select using (bucket_id = 'post-images');

drop policy if exists "post_images_admin_insert" on storage.objects;
create policy "post_images_admin_insert" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'post-images' and public.is_admin());

drop policy if exists "post_images_admin_delete" on storage.objects;
create policy "post_images_admin_delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'post-images' and public.is_admin());
