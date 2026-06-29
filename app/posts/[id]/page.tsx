import { supabase } from '@/lib/supabase'
import { notFound } from 'next/navigation'
import CommentForm from './CommentForm'

// 定义数据类型
type Post = {
  id: number
  title: string
  content: string
  created_at: string
  published: boolean
}

type Comment = {
  id: number
  post_id: number
  name: string
  content: string
  created_at: string
}

// 获取文章
async function getPost(id: number): Promise<Post | null> {
  const { data: post, error } = await supabase
    .from('posts')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !post) return null
  return post as Post
}

// 获取评论
async function getComments(postId: number): Promise<Comment[]> {
  const { data: comments } = await supabase
    .from('comments')
    .select('*')
    .eq('post_id', postId)
    .order('created_at', { ascending: true })

  return (comments as Comment[]) || []
}

export default async function PostPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const post = await getPost(Number(id))

  if (!post) {
    notFound()
  }

  const comments = await getComments(Number(id))

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

        <div className="prose prose-lg max-w-none bg-white rounded-xl p-8 shadow-sm">
          {post.content?.split('\n').map((line, index) => (
            <p key={index} className="mb-4 text-gray-700 leading-relaxed">
              {line || ' '}
            </p>
          ))}
        </div>

        {/* ===== 评论区 ===== */}
        <div className="mt-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">
            💬 评论 ({comments.length})
          </h2>

          {/* 评论列表 */}
          {comments.length === 0 ? (
            <p className="text-gray-400 text-center py-8 bg-white rounded-xl">
              还没有评论，来写第一条吧～
            </p>
          ) : (
            <div className="space-y-4">
              {comments.map((comment) => (
                <div
                  key={comment.id}
                  className="bg-white rounded-xl p-6 shadow-sm"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span className="w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-bold">
                      {comment.name.charAt(0)}
                    </span>
                    <span className="font-medium text-gray-900">
                      {comment.name}
                    </span>
                    <span className="text-gray-400 text-sm">
                      {new Date(comment.created_at).toLocaleDateString('zh-CN')}
                    </span>
                  </div>
                  <p className="text-gray-700">{comment.content}</p>
                </div>
              ))}
            </div>
          )}

          {/* 评论表单（客户端组件） */}
          <CommentForm postId={Number(id)} />
        </div>
      </article>
    </div>
  )
}
