-- 0019_search_rag_indexes.sql
-- 搜索与混合检索所需的索引
--
-- 说明：
-- - pg_trgm 的 GIN 索引支持 ILIKE '%q%' 与 similarity() 排序
-- - posts.title / posts.content 的 trgm 索引已在 0005 建立
-- - 这里补 excerpt 与 article_chunks.content，供搜索与 RAG 关键词召回使用

create extension if not exists pg_trgm;

create index if not exists posts_excerpt_trgm_idx
  on public.posts using gin (excerpt gin_trgm_ops);

create index if not exists article_chunks_content_trgm_idx
  on public.article_chunks using gin (content gin_trgm_ops);
