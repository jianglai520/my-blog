'use client'

import { supabase } from '@/lib/supabase'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function CommentForm({ postId }: { postId: number }) {
  const router = useRouter()
  const [name, setName] = useState('')
  const [content, setContent] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!name.trim() || !content.trim()) {
      setMessage('⚠️ 昵称和评论内容都不能为空')
      return
    }

    setLoading(true)
    setMessage('')

    const { error } = await supabase
      .from('comments')
      .insert([
        {
          post_id: postId,
          name: name.trim(),
          content: content.trim(),
        },
      ])

    setLoading(false)

    if (error) {
      setMessage('❌ 评论失败：' + error.message)
    } else {
      setMessage('✅ 评论成功！')
      setName('')
      setContent('')
      // 刷新页面显示新评论
      setTimeout(() => router.refresh(), 500)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mt-8 bg-white rounded-xl p-8 shadow-sm">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">写评论</h3>

      <div className="mb-4">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="你的昵称"
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div className="mb-4">
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="写下你的评论..."
          rows={4}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y"
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className={`px-6 py-3 rounded-lg text-white font-medium ${
          loading ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'
        }`}
      >
        {loading ? '提交中...' : '发布评论'}
      </button>

      {message && (
        <p className={`mt-4 text-sm ${
          message.includes('✅') ? 'text-green-600' : 'text-red-600'
        }`}>
          {message}
        </p>
      )}
    </form>
  )
}
