-- ============================================================
-- 0009_rate_limit.sql — 评论限流支持（记录 IP）
-- 执行方式：Supabase 控制台 → SQL Editor 粘贴执行（幂等）
-- ============================================================

-- comments 增加 ip 列（记录评论者 IP，用于限流与后续审核）
alter table public.comments add column if not exists ip text;
