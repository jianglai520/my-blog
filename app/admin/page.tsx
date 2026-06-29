'use client'

import { supabase } from '@/lib/supabase'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

// 文章数据类型
type Post = {
  id: number
  title: string
  content: string
  created_at: string
  published: boolean
}

export default function AdminPage() {
  const router = useRouter()
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [checking, setChecking] = useState(true)
  const [posts, setPosts] = useState<Post[]>([])
  const [userEmail, setUserEmail] = useState('')

  // 页面加载时检查是否已登录，并获取文章列表
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        router.push('/login')
      } else {
        setUserEmail(session.user.email || '')
        setChecking(false)
        fetchPosts()
      }
    })
  }, [router])

  // 从数据库读取所有文章
  async function fetchPosts() {
    const { data } = await supabase
      .from('posts')
      .select('*')
      .order('created_at', { ascending: false })

    if (data) setPosts(data as Post[])
  }

  // 退出登录
  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  // 发布文章
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!title.trim() || !content.trim()) {
      setMessage('⚠️ 标题和内容都不能为空')
      return
    }

    setLoading(true)
    setMessage('')

    const { error } = await supabase
      .from('posts')
      .insert([
        { title: title.trim(), content: content.trim(), published: true },
      ])

    setLoading(false)

    if (error) {
      setMessage('❌ 发布失败：' + error.message)
    } else {
      setMessage('✅ 发布成功！')
      setTitle('')
      setContent('')
      fetchPosts() // 刷新文章列表
    }
  }

  // 删除文章
  async function handleDelete(postId: number) {
    if (!confirm('确定要删除这篇文章吗？')) return

    const { error } = await supabase
      .from('posts')
      .delete()
      .eq('id', postId)

    if (error) {
      alert('❌ 删除失败：' + error.message)
    } else {
      alert('✅ 删除成功！')
      fetchPosts() // 刷新文章列表
    }
  }

  // 检查登录中，显示加载
  if (checking) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-400">检查登录状态...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-4xl mx-auto px-4">
        {/* 顶部导航 */}
        <div className="mb-8 flex justify-between items-center">
          <div>
            <a href="/" className="text-blue-600 hover:text-blue-800 text-sm">
              ← 返回首页
            </a>
            <h1 className="text-3xl font-bold text-gray-900 mt-2">后台管理</h1>
            <p className="text-gray-400 text-sm mt-1">
              当前登录：{userEmail}
            </p>
          </div>
          <button
            onClick={handleLogout}
            className="text-sm text-red-500 hover:text-red-700"
          >
            退出登录
          </button>
        </div>

        {/* ===== 发布文章表单 ===== */}
        <div className="bg-white rounded-xl p-8 shadow-sm mb-8">
          <h2 className="text-xl font-bold text-gray-900 mb-6">📝 写新文章</h2>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">文章标题</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="给文章起个标题..."
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">文章内容</label>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="开始写文章吧..."
                rows={10}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-y"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className={`w-full py-3 px-6 rounded-lg text-white font-medium text-lg ${
                loading ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              {loading ? '发布中...' : '📝 发布文章'}
            </button>

            {message && (
              <p className={`text-center ${
                message.includes('✅') ? 'text-green-600' : 'text-red-600'
              }`}>
                {message}
              </p>
            )}
          </form>
        </div>

        {/* ===== 文章管理列表 ===== */}
        <div className="bg-white rounded-xl p-8 shadow-sm">
          <h2 className="text-xl font-bold text-gray-900 mb-6">📋 文章管理</h2>

          {posts.length === 0 ? (
            <p className="text-gray-400 text-center py-8">还没有文章～</p>
          ) : (
            <div className="space-y-4">
              {posts.map((post) => (
                <div
                  key={post.id}
                  className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50"
                >
                  <div className="flex-1 min-w-0">
                    <a
                      href={`/posts/${post.id}`}
                      className="text-lg font-medium text-gray-900 hover:text-blue-600 truncate block"
                    >
                      {post.title}
                    </a>
                    <p className="text-sm text-gray-400 mt-1">
                      {new Date(post.created_at).toLocaleDateString('zh-CN')}
                    </p>
                  </div>
                  <button
                    onClick={() => handleDelete(post.id)}
                    className="ml-4 px-4 py-2 text-sm text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-colors flex-shrink-0"
                  >
                    删除
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
