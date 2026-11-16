-- 0016_site_visits.sql
-- 全站访客统计：按天去重，只存哈希，不存原始 IP/UA
--
-- 说明：
-- - visitor_hash = sha256(ip | user-agent | salt)，由服务端计算，跨天稳定
-- - unique (visit_date, visitor_hash) 保证同一访客每天只记一次
-- - 累计 UV = count(distinct visitor_hash)；今日 UV = 当天 distinct
-- - 写入走服务端 Drizzle 直连（postgres 角色），因此不需要开放的写策略
-- - 开启 RLS 且不建策略：匿名/登录用户都无法直接读表，避免暴露逐行数据

create table if not exists public.site_visits (
  id bigint generated always as identity primary key,
  visit_date date not null default ((now() at time zone 'Asia/Shanghai')::date),
  visitor_hash text not null,
  path text,
  created_at timestamptz not null default now(),
  constraint site_visits_date_hash_key unique (visit_date, visitor_hash)
);

create index if not exists site_visits_visitor_hash_idx
  on public.site_visits (visitor_hash);

create index if not exists site_visits_visit_date_idx
  on public.site_visits (visit_date);

alter table public.site_visits enable row level security;

comment on table public.site_visits is
  '全站访客（按天去重，仅存 sha256 哈希，不含原始 IP/UA）';
