-- 0018_post_view_dedupe.sql
-- 浏览量按天去重：
--   post_views (post_id, view_date, visitor_hash) 唯一
--   只有首次插入时才给 posts.view_count +1
-- visitor_hash 由服务端计算（IP + salt），不保存明文 IP。

create table if not exists public.post_views (
  id bigint generated always as identity primary key,
  post_id bigint not null references public.posts(id) on delete cascade,
  view_date date not null default ((now() at time zone 'Asia/Shanghai')::date),
  visitor_hash text not null,
  created_at timestamptz not null default now(),
  constraint post_views_post_date_hash_key unique (post_id, view_date, visitor_hash)
);

create index if not exists post_views_post_date_idx
  on public.post_views (post_id, view_date);

alter table public.post_views enable row level security;

comment on table public.post_views is
  '文章浏览量去重记录（同一访客每天每篇只计一次，不存明文 IP）';

-- 记录一次浏览：只有当天该访客首次访问才 +1，返回最新 view_count
create or replace function public.record_post_view(
  p_post_id bigint,
  p_visitor_hash text
)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  v_rows integer := 0;
  v_count bigint;
begin
  -- 只统计已发布文章
  if p_post_id is null or not exists (
    select 1 from public.posts where id = p_post_id and status = 'published'
  ) then
    select view_count into v_count from public.posts where id = p_post_id;
    return coalesce(v_count, 0);
  end if;

  -- 没有有效访客标识时只返回当前值，不计数
  if p_visitor_hash is null or length(p_visitor_hash) < 16 then
    select view_count into v_count from public.posts where id = p_post_id;
    return coalesce(v_count, 0);
  end if;

  insert into public.post_views (post_id, view_date, visitor_hash)
  values (
    p_post_id,
    (now() at time zone 'Asia/Shanghai')::date,
    left(p_visitor_hash, 64)
  )
  on conflict (post_id, view_date, visitor_hash) do nothing;

  get diagnostics v_rows = row_count;

  if v_rows > 0 then
    update public.posts
    set view_count = view_count + 1
    where id = p_post_id
    returning view_count into v_count;
  else
    select view_count into v_count from public.posts where id = p_post_id;
  end if;

  return coalesce(v_count, 0);
end;
$$;

revoke all on function public.record_post_view(bigint, text) from public;
grant execute on function public.record_post_view(bigint, text) to anon, authenticated;
