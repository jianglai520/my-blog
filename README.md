# ✨ 我的个人博客

基于 **Next.js + Supabase + Vercel** 搭建的全栈个人博客，支持多用户注册发文、后台管理、登录保护、评论区等功能。

## 🔗 线上地址

https://jianglai520.com

## 🛠️ 技术栈

| 技术 | 用途 |
|------|------|
| **Next.js 16** | 前端框架（App Router） |
| **TypeScript** | 类型安全 |
| **Tailwind CSS** | 样式 |
| **Supabase** | 数据库 + 认证（Auth） |
| **Vercel** | 托管部署 |

## ✨ 已实现功能

| 功能 | 状态 |
|------|------|
| 📄 首页展示文章列表 | ✅ |
| 📖 文章详情页 | ✅ |
| 📝 发布新文章 | ✅ |
| 🔐 邮箱登录/注册 | ✅ |
| 🛡️ 后台登录保护（未登录自动跳转） | ✅ |
| 📋 后台文章管理列表 | ✅ |
| 🗑️ 文章删除（仅本人） | ✅ |
| 🌐 自定义域名绑定 | ✅ |
| 💬 评论区 | ✅ |

## 🚀 本地运行

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev
```

打开 http://localhost:3000 即可查看。

## 📁 项目结构

```
my-blog/
  ├── app/
  │   ├── page.tsx            # 首页（文章列表）
  │   ├── layout.tsx          # 全局布局
  │   ├── globals.css         # 全局样式
  │   ├── posts/
  │   │   └── [id]/
  │   │       └── page.tsx    # 文章详情页
  │   │       └── CommentForm.tsx  # 评论表单组件
  │   ├── admin/
  │   │   └── page.tsx        # 后台管理（发布+删除文章）
  │   └── login/
  │       └── page.tsx        # 登录/注册页
  ├── lib/
  │   └── supabase.js         # Supabase 客户端配置
  └── .env.local              # 环境变量（不提交到 Git）
```

## 🔐 权限说明

| 操作 | 谁可以 |
|------|--------|
| 浏览文章 | 所有人 |
| 注册账号 | 所有人 |
| 发布文章 | 任何登录用户 |
| 删除文章 | 仅本人邮箱 |

## 🌐 部署

代码推送到 GitHub 后，Vercel 自动部署：

```bash
git add .
git commit -m "更新内容"
git push
```

## 📄 详细教程

完整搭建指南见桌面文件：`新手全栈博客搭建指南.md`
