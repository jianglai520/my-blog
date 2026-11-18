-- 0022_posts_reading_minutes.sql
-- 文章阅读时长（分钟）落库，避免列表页为了计算时长读取整篇正文
--
-- 说明：
-- - 由 Server Action 在创建/更新文章时写入
-- - 历史文章由 scripts/backfill-reading-time.mjs 回填
-- - 列表查询只取 left(content, 500) 作为摘要兜底

alter table public.posts
  add column if not exists reading_minutes int not null default 1;

comment on column public.posts.reading_minutes is '预计阅读时长（分钟），发布/编辑时计算';
