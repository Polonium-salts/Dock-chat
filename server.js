const { createServer } = require('http');
const { Server } = require('socket.io');
const { parse } = require('url');

const httpServer = createServer((req, res) => {
  const parsedUrl = parse(req.url, true);
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('Socket.IO server');
});

const io = new Server(httpServer, {
  cors: {
    origin: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
    methods: ["GET", "POST"],
    credentials: true,
  },
  path: '/api/socket',
  transports: ['websocket', 'polling'],
  pingTimeout: 60000,
  pingInterval: 25000,
});

// 存储连接的客户端
const connectedClients = new Map();

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  connectedClients.set(socket.id, { rooms: new Set(['general']) });

  // 加入默认房间
  socket.join('general');
  console.log(`Socket ${socket.id} joined room: general`);

  socket.on('message', (message) => {
    console.log('Received message from client:', message);
    try {
      // 确保消息包含必要的字段
      if (!message || !message.content || !message.user) {
        throw new Error('Invalid message format');
      }

      const roomId = message.roomId || 'general';
      
      const enhancedMessage = {
        ...message,
        timestamp: message.timestamp || new Date().toISOString(),
        socketId: socket.id,
        roomId: roomId
      };
      
      console.log('Broadcasting message to room:', roomId);
      
      // 广播消息到指定房间
      io.to(roomId).emit('message', enhancedMessage);
      console.log('Message broadcasted successfully');
      
    } catch (error) {
      console.error('Error processing message:', error);
      socket.emit('error', { 
        message: 'Failed to process message',
        error: error.message 
      });
    }
  });

  socket.on('join_room', (roomId) => {
    try {
      if (!roomId) throw new Error('Room ID is required');
      
      console.log(`Socket ${socket.id} joining room: ${roomId}`);
      socket.join(roomId);
      connectedClients.get(socket.id).rooms.add(roomId);
      
      socket.emit('room_joined', { roomId });
      console.log(`Socket ${socket.id} joined room: ${roomId}`);
    } catch (error) {
      console.error(`Error joining room: ${error.message}`);
      socket.emit('error', { 
        message: 'Failed to join room',
        error: error.message 
      });
    }
  });

  socket.on('leave_room', (roomId) => {
    try {
      if (!roomId) throw new Error('Room ID is required');
      
      console.log(`Socket ${socket.id} leaving room: ${roomId}`);
      socket.leave(roomId);
      connectedClients.get(socket.id).rooms.delete(roomId);
      
      socket.emit('room_left', { roomId });
      console.log(`Socket ${socket.id} left room: ${roomId}`);
    } catch (error) {
      console.error(`Error leaving room: ${error.message}`);
      socket.emit('error', { 
        message: 'Failed to leave room',
        error: error.message 
      });
    }
  });

  socket.on('disconnect', (reason) => {
    console.log(`Client disconnected (${socket.id}):`, reason);
    connectedClients.delete(socket.id);
  });

  socket.on('error', (error) => {
    console.error(`Socket error (${socket.id}):`, error);
  });
});

// 错误处理
io.on('connect_error', (error) => {
  console.error('Connection error:', error);
});

io.on('error', (error) => {
  console.error('IO server error:', error);
});

const PORT = process.env.SOCKET_PORT || 3001;
httpServer.listen(PORT, () => {
  console.log(`Socket.IO server running on port ${PORT}`);
}); 