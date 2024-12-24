import { Server } from 'socket.io'

const ioHandler = (req, res) => {
  if (!res.socket.server.io) {
    const io = new Server(res.socket.server, {
      path: '/api/socket',
      addTrailingSlash: false,
      cors: {
        origin: '*',
        methods: ['GET', 'POST'],
      },
      transports: ['websocket', 'polling'],
    })

    io.on('connection', (socket) => {
      console.log('Client connected:', socket.id)

      socket.on('join', (room) => {
        socket.join(room)
        console.log(`Client ${socket.id} joined room: ${room}`)
      })

      socket.on('leave', (room) => {
        socket.leave(room)
        console.log(`Client ${socket.id} left room: ${room}`)
      })

      socket.on('message', (message) => {
        const room = message.room || 'public'
        io.to(room).emit('message', message)
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