import { supabase } from '@/lib/supabase'
import { notFound } from 'next/navigation'

// 定义文章的数据类型
type Post = {
  id: number
  title: string
  content: string
  created_at: string
  published: boolean
}

// 根据文章 ID 获取单篇文章
async function getPost(id: number): Promise<Post | null> {
  const { data: post, error } = await supabase
    .from('posts')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !post) return null
  return post as Post
}

export default async function PostPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  // Next.js 16 中 params 是一个 Promise，必须使用 await
  const { id } = await params
  const post = await getPost(Number(id))

  // 如果文章不存在，显示 404 页面
  if (!post) {
    notFound()
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 顶部导航 */}
      <header className="bg-white shadow-sm">
        <div className="max-w-3xl mx-auto px-4 py-4">
          <a href="/" className="text-blue-600 hover:text-blue-800">
            ← 返回首页
          </a>
        </div>
      </header>

      {/* 文章内容 */}
      <article className="max-w-3xl mx-auto px-4 py-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          {post.title}
        </h1>

        <p className="text-gray-400 text-sm mb-8">
          发布于{' '}
          {new Date(post.created_at).toLocaleDateString('zh-CN', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          })}
        </p>

        {/* 文章正文 */}
        <div className="prose prose-lg max-w-none bg-white rounded-xl p-8 shadow-sm">
          {post.content?.split('\n').map((line, index) => (
            <p key={index} className="mb-4 text-gray-700 leading-relaxed">
              {line || ' '}
            </p>
          ))}
        </div>
      </article>
    </div>
  )
}
