# Next.js 实时聊天室模板

这是一个基于 Next.js 13+ 构建的实时聊天室应用模板，可以直接部署在 Vercel 平台上。

## 特性

- 💬 实时消息通信
- 🔐 GitHub OAuth 认证
- 🌙 深色模式支持
- 💾 消息持久化存储
- 🔄 自动重连机制
- 📱 响应式设计
- 🎨 现代化 UI 界面

## 技术栈

- Next.js 13+ (App Router)
- Socket.IO
- Prisma ORM
- NextAuth.js
- Tailwind CSS
- Vercel Postgres

## 快速开始

1. 点击 "Deploy with Vercel" 按钮一键部署：

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fyourusername%2Fchat-template&env=NEXTAUTH_URL,NEXTAUTH_SECRET,GITHUB_ID,GITHUB_SECRET&demo-title=Next.js%20Chat%20App&demo-description=A%20real-time%20chat%20application%20template&demo-url=https%3A%2F%2Fchat-template.vercel.app)

2. 配置环境变量：

在 Vercel 项目设置中添加以下环境变量：

\`\`\`bash
# NextAuth.js
NEXTAUTH_URL=你的应用URL（例如：https://your-app.vercel.app）
NEXTAUTH_SECRET=生成的随机密钥

# GitHub OAuth
GITHUB_ID=你的GitHub OAuth应用ID
GITHUB_SECRET=你的GitHub OAuth应用密钥

# 数据库（Vercel 会自动配置）
DATABASE_URL=你的PostgreSQL数据库URL
\`\`\`

3. 配置 GitHub OAuth：

- 前往 GitHub Settings > Developer settings > OAuth Apps
- 创建新的 OAuth 应用
- 设置回调 URL 为：\`https://your-app.vercel.app/api/auth/callback/github\`
- 复制 Client ID 和 Client Secret 到环境变量

## 本地开发

1. 克隆仓库：

\`\`\`bash
git clone https://github.com/yourusername/chat-template.git
cd chat-template
\`\`\`

2. 安装依赖：

\`\`\`bash
npm install
\`\`\`

3. 复制环境变量文件：

\`\`\`bash
cp .env.example .env.local
\`\`\`

4. 配置环境变量：

编辑 \`.env.local\` 文件，填入必要的环境变量。

5. 初始化数据库：

\`\`\`bash
npx prisma generate
npx prisma db push
\`\`\`

6. 启动开发服务器：

\`\`\`bash
npm run dev
\`\`\`

## 功能

- 用户认证
  - GitHub 登录
  - 会话管理
  - 用户信息显示

- 聊天功能
  - 实时消息发送/接收
  - 消息持久化
  - 多聊天室支持
  - 未读消息提醒

- 界面功能
  - 响应式设计
  - 深色模式
  - 消息时间显示
  - 用户头像显示

- 设置功能
  - 主题切换
  - 个人信息设置
  - GitHub 信息同步

## 项目结构

\`\`\`
├── app/                  # Next.js 13 App Router
│   ├── api/             # API 路由
│   ├── components/      # React 组件
│   ├── providers/       # 全局提供者
│   └── page.js         # 主页面
├── lib/                 # 工具函数
├── prisma/             # Prisma 配置和模型
└── public/             # 静态资源
\`\`\`

## 自定义

1. 修改主题：
   - 编辑 \`tailwind.config.js\` 自定义颜色和样式
   - 修改 \`app/globals.css\` 添加自定义样式

2. 添加功能：
   - 在 \`app/api\` 中添加新的 API 路由
   - 在 \`app/components\` 中创建新的组件
   - 在 \`prisma/schema.prisma\` 中添加新的数据模型

## 部署

1. 推送代码到 GitHub

2. 在 Vercel 中导入项目：
   - 连接 GitHub 仓库
   - 配置环境变量
   - 部署项目

3. 配置域名（可选）：
   - 在 Vercel 项目设置中添加自定义域名
   - 更新 GitHub OAuth 回调 URL

## 贡献

欢迎提交 Issue 和 Pull Request！

## 许可

MIT License
