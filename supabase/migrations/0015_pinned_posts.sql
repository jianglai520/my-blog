-- 0015_pinned_posts.sql
-- 文章置顶：标记置顶文章，首页优先展示（幂等，可重复执行）

ALTER TABLE posts
  ADD COLUMN IF NOT EXISTS pinned boolean NOT NULL DEFAULT false;

-- 列表排序索引：置顶优先 + 时间倒序
CREATE INDEX IF NOT EXISTS idx_posts_pinned_created_at
  ON posts (pinned DESC, created_at DESC);
