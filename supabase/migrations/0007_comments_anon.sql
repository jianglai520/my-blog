-- ============================================================
-- 0007_comments_anon.sql — 修复匿名访客评论权限
-- 执行方式：Supabase 控制台 → SQL Editor 粘贴执行（幂等）
--
-- 背景：0001 只给 authenticated 授予 comments 的 INSERT，
-- 但评论是公开功能（未登录访客也能发），anon 身份插入被拒（42501）。
-- 修复：anon 也授予 comments 的 INSERT（RLS 的 comments_insert_public
-- 本就允许公开插入，只缺表级权限这一环）。
-- ============================================================

grant insert on public.comments to anon, authenticated;
