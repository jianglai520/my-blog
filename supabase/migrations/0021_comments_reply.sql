-- 0021_comments_reply.sql
-- 文章评论：博主回复
--
-- 说明：
-- - 新增 reply / replied_at 两列；reply 为空表示未回复
-- - 仅博主可 UPDATE（RLS + 表级 GRANT）
-- - 公开评论区通过 select 读取 reply，无需额外策略

alter table public.comments
  add column if not exists reply text;

alter table public.comments
  add column if not exists replied_at timestamptz;

-- 仅博主可更新（回复/清除回复）
drop policy if exists "comments_update_admin" on public.comments;
create policy "comments_update_admin" on public.comments
  for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

grant update on public.comments to authenticated;

comment on column public.comments.reply is '博主回复内容（null 表示未回复）';
comment on column public.comments.replied_at is '回复时间（清除回复时置空）';
