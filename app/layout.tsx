import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: '我的博客',
  description: '用 Next.js + Supabase 搭建的全栈个人博客',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="zh-CN">
      <body className="antialiased">{children}</body>
    </html>
  )
}