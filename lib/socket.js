import { Server } from 'socket.io'

export const config = {
  api: {
    bodyParser: false,
  },
}

export default function SocketHandler(req, res) {
  if (res.socket.server.io) {
    res.end()
    return
  }

  const io = new Server(res.socket.server, {
    path: '/api/socketio',
    addTrailingSlash: false,
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
    transports: ['polling'],
    connectTimeout: 10000,
    pingTimeout: 5000,
    pingInterval: 10000,
  })

  res.socket.server.io = io

  io.on('connection', (socket) => {
    console.log('Client connected')

    socket.on('message', (msg) => {
      io.emit('message', msg)
    })

    socket.on('disconnect', () => {
      console.log('Client disconnected')
    })
  })

  res.end()
} 