-- ============================================================
-- 0014_index_status.sql — 文章 AI 索引状态（发布异步化的支撑字段）
-- 执行方式：Supabase 控制台 → SQL Editor 粘贴执行（幂等）
-- 目的：发布文章不再同步等待 embedding，改为标记 pending，
--       由定时任务（GitHub Actions）批量处理向量索引。
-- ============================================================

alter table public.posts
  add column if not exists index_status text not null default 'pending';

-- 存量已发布文章：默认视为已索引（历史索引由全量脚本维护，避免误触发增量重跑）
update public.posts
  set index_status = 'done'
  where index_status = 'pending' and status = 'published';
