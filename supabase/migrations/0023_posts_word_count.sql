-- 0023_posts_word_count.sql
-- 文章字数落库，归档页不再为了统计字数读取整篇正文
--
-- 说明：
-- - 由 Server Action 在创建/更新文章时写入
-- - 历史文章由 scripts/backfill-reading-time.mjs 一并回填（该脚本同时写 reading_minutes）

alter table public.posts
  add column if not exists word_count int not null default 0;

comment on column public.posts.word_count is '正文字数（中文字符 + 英文词），发布/编辑时计算';
