-- ============================================================
-- 0008_comments_created_at.sql — 修复评论时间列缺失默认值
-- 执行方式：Supabase 控制台 → SQL Editor 粘贴执行（幂等）
--
-- 背景：comments 是最早期手动创建的旧表，created_at 可空且无默认值，
-- 插入时未传该列 → null → 前端显示 1970-01-01。posts 等后建表均有
-- default now()，故只有评论受影响。
-- 修复：补默认值 + 回填历史 null + 加 NOT NULL 约束。
-- ============================================================

alter table public.comments alter column created_at set default now();

update public.comments set created_at = now() where created_at is null;

alter table public.comments alter column created_at set not null;
