# DockChat

DockChat 是一个现代化的实时聊天应用，支持多房间聊天、AI 对话、RSS 订阅和音乐播放等功能。

## 功能特点

- 💬 实时聊天
  - 多房间支持
  - 公共和私人聊天室
  - 消息历史记录
  - 在线状态显示

- 🤖 AI 对话
  - 支持多个 AI 模型
  - 聊天记录保存
  - 智能对话管理

- 📰 RSS 阅读器
  - 多源订阅支持
  - 自动发现 RSS 源
  - 分类管理
  - 实时更新

- 🎵 音乐播放器
  - 在线音乐播放
  - 歌词同步显示
  - 播放列表管理

- 🎨 个性化设置
  - 主题切换
  - 背景图片自定义
  - 字体大小调整
  - 多语言支持

## 技术栈

- **前端框架**: Next.js 15
- **UI 框架**: TailwindCSS
- **实时通信**: Socket.IO
- **状态管理**: React Hooks
- **认证**: NextAuth.js
- **API**: RESTful + WebSocket

## 快速开始

### 环境要求

- Node.js 18+
- npm 或 yarn
- 现代浏览器

### 安装步骤

1. 克隆仓库
```bash
git clone https://github.com/yourusername/DockChat.git
cd DockChat
```

2. 安装依赖
```bash
npm install
# 或
yarn install
```

3. 配置环境变量
```bash
cp .env.example .env.local
```
编辑 `.env.local` 文件，填入必要的配置信息：
```env
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret-key
NEXT_PUBLIC_SOCKET_URL=http://localhost:3001
```

4. 启动开发服务器
```bash
# 启动 Socket.IO 服务器
npm run server
# 新开一个终端，启动 Next.js 开发服务器
npm run dev
```

5. 访问应用
打开浏览器访问 `http://localhost:3000`

## 项目结构

```
DockChat/
├── app/                    # Next.js 应用目录
│   ├── api/               # API 路由
│   ├── components/        # React 组件
│   ├── hooks/            # 自定义 Hooks
│   └── services/         # 服务层
├── public/                # 静态资源
├── messages/              # 国际化文件
├── server.js             # Socket.IO 服务器
└── next.config.js        # Next.js 配置
```

## 开发指南

### 添加新功能

1. 创建功能分支
```bash
git checkout -b feature/your-feature-name
```

2. 开发新功能
3. 提交更改
```bash
git add .
git commit -m "feat: add your feature"
```

4. 推送到远程仓库
```bash
git push origin feature/your-feature-name
```

### 代码规范

- 使用 ESLint 进行代码检查
- 遵循 React Hooks 的使用规则
- 组件采用函数式编写
- 使用 TypeScript 类型注解

## 部署

### 生产环境构建

```bash
npm run build
npm start
```

### 使用 Docker 部署

1. 构建镜像
```bash
docker build -t dockchat .
```

2. 运行容器
```bash
docker run -p 3000:3000 -p 3001:3001 dockchat
```

## 贡献指南

1. Fork 本仓库
2. 创建功能分支
3. 提交更改
4. 发起 Pull Request

## 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情

## 联系方式

- 作者：[Your Name]
- 邮箱：[your.email@example.com]
- 项目地址：[https://github.com/yourusername/DockChat]

## 致谢

感谢所有为本项目做出贡献的开发者！
