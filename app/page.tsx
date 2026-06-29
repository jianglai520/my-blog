import { supabase } from '@/lib/supabase'

// 定义文章的数据类型
type Post = {
  id: number
  title: string
  content: string
  created_at: string
  published: boolean
}

// 从数据库读取所有文章
async function getPosts(): Promise<Post[]> {
  const { data: posts, error } = await supabase
    .from('posts')           // 从 posts 表读取
    .select('*')             // 选取所有字段
    .eq('published', true)   // 只取已发布的
    .order('created_at', { ascending: false }) // 按时间倒序（最新的在前）

  if (error) {
    console.error('读取文章失败:', error)
    return []
  }
  return (posts as Post[]) || []
}

// 首页组件
export default async function Home() {
  const posts = await getPosts()

  return (
    <div className="min-h-screen bg-gradient-to-r from-blue-600 to-purple-600">
      {/* 网站顶部标题区域 */}
      <header className="bg-white shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-16">
          <h1 className="text-4xl font-bold text-white text-center">
            ✨ 我的博客
          </h1>
          <p className="text-gray-300 text-center mt-2">
            用 Next.js + Supabase 搭建的全栈博客
          </p>
          <div className="text-center mt-6">
            <a
              href="/admin"
              className="inline-block bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              写文章
            </a>
          </div>
        </div>
      </header>

      {/* 文章列表区域 */}
      <main className="max-w-4xl mx-auto px-4 py-8">
        {posts.length === 0 ? (
          // 没有文章时显示
          <div className="text-center py-20">
            <p className="text-gray-400 text-lg">还没有文章哦～</p>
          </div>
        ) : (
          // 有文章就列表展示
          <div className="grid gap-6">
            {posts.map((post) => (
              <a
                key={post.id}
                href={`/posts/${post.id}`}
                className="block bg-white rounded-2xl p-6 shadow-md hover:shadow-xl transition-shadow"
              >
                <h2 className="text-2xl font-semibold text-gray-900 mb-2">
                  {post.title}
                </h2>
                <p className="text-gray-400 text-sm">
                  {new Date(post.created_at).toLocaleDateString('zh-CN', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </p>
                <p className="text-gray-600 mt-3 line-clamp-2">
                  {post.content?.substring(0, 150)}
                  {post.content?.length > 150 ? '...' : ''}
                </p>
              </a>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}