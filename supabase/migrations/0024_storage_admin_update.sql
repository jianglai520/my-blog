-- 0024_storage_admin_update.sql
-- post-images 桶：允许博主覆盖上传（UPDATE）
--
-- 背景：
-- - 现有策略只有 INSERT / DELETE / 公开 SELECT
-- - 图片优化脚本使用 storage.upload(..., { upsert: true }) 覆盖同路径时，
--   Supabase 需要 UPDATE 策略，否则报：
--   "new row violates row-level security policy"
-- - 与 insert/delete 保持一致：仅 authenticated 且 is_admin() 可操作

drop policy if exists post_images_admin_update on storage.objects;

create policy post_images_admin_update
on storage.objects
for update
to authenticated
using (bucket_id = 'post-images' and is_admin())
with check (bucket_id = 'post-images' and is_admin());
