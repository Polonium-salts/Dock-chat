import { Server } from 'socket.io'
import { addChatMessage, addOnlineUser, removeOnlineUser } from '@/lib/redis'

const ioHandler = (req, res) => {
  if (!res.socket.server.io) {
    console.log('Initializing Socket.IO server...')
    const io = new Server(res.socket.server, {
      path: '/api/socket',
      addTrailingSlash: false,
      cors: {
        origin: '*',
        methods: ['GET', 'POST', 'OPTIONS'],
        credentials: true,
      },
      transports: ['websocket', 'polling'],
    })

    io.on('connection', (socket) => {
      console.log('Client connected:', socket.id)

      socket.on('join', (data) => {
        const { room, userId } = data
        socket.join(room)
        console.log(`Client ${socket.id} joined room: ${room}`)
      })

      socket.on('leave', (data) => {
        const { room } = data
        socket.leave(room)
        console.log(`Client ${socket.id} left room: ${room}`)
      })

      socket.on('message', (message) => {
        console.log('Received message:', message)
        const room = message.room || 'public'
        io.to(room).emit('message', message)
      })

      socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id)
      })
    })

    res.socket.server.io = io
  } else {
    console.log('Socket.IO server already running')
  }

  res.end()
}

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req, res) {
  return ioHandler(req, res)
}

export async function POST(req, res) {
  return ioHandler(req, res)
} 