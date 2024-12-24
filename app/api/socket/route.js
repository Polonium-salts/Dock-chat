import { Server } from 'socket.io'

const getBaseUrl = () => {
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`
  return process.env.NEXTAUTH_URL || 'http://localhost:3000'
}

// 存储在线用户和消息历史
const onlineUsers = new Map()
const messageHistory = []
const MAX_MESSAGES = 100 // 最多保存100条消息

const ioHandler = async (req, res) => {
  if (!res.socket.server.io) {
    console.log('Initializing Socket.IO server...')
    const io = new Server(res.socket.server, {
      path: '/api/socket',
      addTrailingSlash: false,
      cors: {
        origin: getBaseUrl(),
        methods: ['GET', 'POST'],
        credentials: true
      },
      transports: ['websocket', 'polling'],
      pingTimeout: 60000,
      pingInterval: 25000,
      secure: true,
      rejectUnauthorized: false,
      cookie: {
        secure: true,
        sameSite: 'none'
      }
    })

    io.on('connection', (socket) => {
      console.log('Client connected:', socket.id)

      // 发送消息历史记录
      socket.emit('messages:history', messageHistory)

      // 处理用户加入
      socket.on('user:join', (user) => {
        onlineUsers.set(socket.id, user)
        io.emit('users:update', Array.from(onlineUsers.values()))
      })

      // 处理消息
      socket.on('message', (message) => {
        console.log('Message received:', message)
        
        // 保存消息到历史记录
        messageHistory.push(message)
        if (messageHistory.length > MAX_MESSAGES) {
          messageHistory.shift() // 删除最旧的消息
        }
        
        io.emit('message', message)
      })

      socket.on('error', (error) => {
        console.error('Socket error:', error)
      })

      // 处理用户断开连接
      socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id)
        onlineUsers.delete(socket.id)
        io.emit('users:update', Array.from(onlineUsers.values()))
      })
    })

    res.socket.server.io = io
  }

  res.end()
}

export const GET = ioHandler
export const POST = ioHandler 