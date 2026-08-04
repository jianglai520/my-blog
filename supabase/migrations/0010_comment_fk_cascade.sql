-- 0010: comments 外键级联删除 + 清理孤儿评论
-- 背景：comments.post_id 在早期迁移中定义过 references posts(id) on delete cascade，
-- 但生产库该外键实际未建立，导致删除文章后评论成为孤儿数据（后台评论管理无法定位归属）。
-- 本迁移：① 清理历史孤儿评论；② 补建外键（幂等，已存在则跳过）。

-- 1. 清理孤儿评论（post_id 指向已不存在的文章）
delete from comments c
where not exists (select 1 from posts p where p.id = c.post_id);

-- 2. 补建外键（若不存在）
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'comments'::regclass and conname = 'comments_post_id_fkey'
  ) then
    alter table comments
      add constraint comments_post_id_fkey
      foreign key (post_id) references public.posts(id) on delete cascade;
  end if;
end $$;
