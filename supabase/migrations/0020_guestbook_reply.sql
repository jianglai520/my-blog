-- 0020_guestbook_reply.sql
-- 留言板：博主回复
--
-- 说明：
-- - 新增 reply / replied_at 两列；reply 为空表示未回复
-- - 仅博主可 UPDATE（RLS + 表级 GRANT）
-- - 公共页面通过 select 读取 reply，无需额外策略

alter table public.guestbook_messages
  add column if not exists reply text;

alter table public.guestbook_messages
  add column if not exists replied_at timestamptz;

-- 仅博主可更新（回复/清除回复）
drop policy if exists "guestbook_update_admin" on public.guestbook_messages;
create policy "guestbook_update_admin" on public.guestbook_messages
  for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

grant update on public.guestbook_messages to authenticated;

comment on column public.guestbook_messages.reply is '博主回复内容（null 表示未回复）';
comment on column public.guestbook_messages.replied_at is '回复时间（清除回复时置空）';
