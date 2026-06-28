'use client'

import { supabase } from '@/lib/supabase'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function AdminPage() {
  const router = useRouter()
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

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
        {
          title: title.trim(),
          content: content.trim(),
          published: true,
        },
      ])

    setLoading(false)

    if (error) {
      setMessage('❌ 发布失败：' + error.message)
    } else {
      setMessage('✅ 发布成功！')
      setTitle('')
      setContent('')
      setTimeout(() => router.push('/'), 1500)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-2xl mx-auto px-4">
        <div className="mb-8">
          <a href="/" className="text-blue-600 hover:text-blue-800 text-sm">
            ← 返回首页
          </a>
          <h1 className="text-3xl font-bold text-gray-900 mt-2">
            写新文章
          </h1>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-xl p-8 shadow-sm space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              文章标题
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="给文章起个标题..."
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              文章内容
            </label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="开始写文章吧..."
              rows={15}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-y"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className={`w-full py-3 px-6 rounded-lg text-white font-medium text-lg ${
              loading
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700'
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
    </div>
  )
}
