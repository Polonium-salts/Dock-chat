import { Server } from 'socket.io'

const getBaseUrl = () => {
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`
  return process.env.NEXTAUTH_URL || 'http://localhost:3000'
}

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
      pingInterval: 25000
    })

    io.on('connection', (socket) => {
      console.log('Client connected:', socket.id)

      socket.on('message', (message) => {
        console.log('Message received:', message)
        io.emit('message', message)
      })

      socket.on('error', (error) => {
        console.error('Socket error:', error)
      })

      socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id)
      })
    })

    res.socket.server.io = io
  }

  res.end()
}

export const GET = ioHandler
export const POST = ioHandler 