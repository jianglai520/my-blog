-- ============================================================
-- 0026_column_privileges.sql — 收回匿名角色对 IP 列的 SELECT 权限
-- 执行方式：Supabase 控制台 → SQL Editor 粘贴执行（幂等）
--
-- 背景：
--   0001 / 0011 / 0025 给 anon 授的是「表级 SELECT」，配合公开 RLS 策略，
--   任何匿名访客都能通过 PostgREST 导出 comments / guestbook_messages / replies
--   的整行数据，其中包含 ip（sha256 哈希）。哈希虽不可逆，但属于不该公开的
--   服务端标识，且配置盐后可被关联去重。
--
-- 处理：
--   1) 先 revoke 表级 SELECT（表级权限覆盖所有列，不 revoke 则列级授权没有意义）
--   2) 再按列 grant，排除 ip
--   authenticated（单一博主/后台）保留表级 SELECT，避免后台 select * 失效。
--
-- 注意：
--   - 未来给这三张表加新列时，如需匿名可读，必须在本文件追加/修改列清单。
--   - 应用层公开读走 Drizzle 直连（DATABASE_URL），不依赖 anon 的 SELECT 权限；
--     互动写入走 Server Action，限流已统一到 rate_limit_events。
-- ============================================================

-- ---------- comments ----------
revoke select on public.comments from anon;
grant select (
  id,
  post_id,
  name,
  content,
  created_at,
  status,
  reply,
  replied_at,
  avatar_data
) on public.comments to anon;

-- ---------- guestbook_messages ----------
revoke select on public.guestbook_messages from anon;
grant select (
  id,
  name,
  content,
  created_at,
  avatar_data,
  reply,
  replied_at
) on public.guestbook_messages to anon;

-- ---------- replies ----------
revoke select on public.replies from anon;
grant select (
  id,
  target_type,
  target_id,
  name,
  avatar_data,
  content,
  created_at
) on public.replies to anon;

-- ============================================================
-- 校验（执行后手动跑一次）：
--   select grantee, table_name, column_name, privilege_type
--   from information_schema.column_privileges
--   where table_schema = 'public'
--     and table_name in ('comments', 'guestbook_messages', 'replies')
--     and grantee = 'anon'
--     and privilege_type = 'SELECT'
--   order by table_name, column_name;
-- 预期：结果里不出现 ip 列。
--
-- 注意：不要省略 privilege_type 过滤。anon 仍保留 INSERT / REFERENCES 表级权限，
-- information_schema.column_privileges 会按列展开这些权限，不筛 SELECT 会看到 ip
-- 以 INSERT / REFERENCES 出现，属于误报。
-- ============================================================
