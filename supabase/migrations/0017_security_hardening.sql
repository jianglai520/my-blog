-- 0017_security_hardening.sql
-- 安全加固：
--   1) 通用数据库限流表（替代 /api/ai 的进程内 Map）
--   2) post-images 桶的 MIME 类型与单文件大小限制
--
-- 说明：
-- - rate_limit_events 只记录 bucket + identifier（IP 哈希）+ 时间，不存明文 IP
-- - 桶级限制是浏览器直传场景下唯一可靠的服务端约束：
--   allowed_mime_types 会拒绝伪造 Content-Type 的白名单外文件
-- - file_size_limit 与 lib/browser/upload.ts 的 20MB 附件上限对齐

create table if not exists public.rate_limit_events (
  id bigint generated always as identity primary key,
  bucket text not null,
  identifier text not null,
  created_at timestamptz not null default now()
);

create index if not exists rate_limit_events_lookup_idx
  on public.rate_limit_events (bucket, identifier, created_at desc);

alter table public.rate_limit_events enable row level security;

comment on table public.rate_limit_events is
  '通用限流事件（bucket + IP 哈希 + 时间），仅供服务端读写';

update storage.buckets
set
  allowed_mime_types = array[
    'image/png',
    'image/jpeg',
    'image/webp',
    'image/gif',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/zip',
    'text/plain',
    'text/markdown'
  ],
  file_size_limit = 20971520
where id = 'post-images';
