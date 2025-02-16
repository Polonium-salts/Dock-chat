const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');
const { Server } = require('socket.io');

const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev });
const handle = app.getRequestHandler();

const messageHistory = new Map();
const activeRooms = new Set();

app.prepare().then(() => {
  const server = createServer((req, res) => {
    const parsedUrl = parse(req.url, true);
    handle(req, res, parsedUrl);
  });

  const io = new Server(server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
      credentials: true
    },
    transports: ['websocket', 'polling'],
    connectionStateRecovery: {
      maxDisconnectionDuration: 2 * 60 * 1000,
      skipMiddlewares: true,
    },
    pingTimeout: 60000,
    pingInterval: 25000,
  });

  io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);

    // 发送历史消息给新连接的客户端
    socket.emit('message_history', Array.from(messageHistory.values()));

    socket.on('message', (message) => {
      console.log('Received message:', message);
      
      try {
        // 确保消息有唯一ID
        const messageId = message.id || Date.now().toString();
        message.id = messageId;
        
        // 存储消息
        messageHistory.set(messageId, message);
        
        // 如果历史消息太多，删除旧消息
        if (messageHistory.size > 100) {
          const oldestKey = messageHistory.keys().next().value;
          messageHistory.delete(oldestKey);
        }

        // 广播消息给所有客户端
        io.emit('message', message);
        console.log('Message broadcasted successfully');
      } catch (error) {
        console.error('Error handling message:', error);
        socket.emit('error', { message: 'Failed to process message' });
      }
    });

    socket.on('join_room', (roomId) => {
      try {
        socket.join(roomId);
        activeRooms.add(roomId);
        console.log(`User ${socket.id} joined room: ${roomId}`);
        
        // 发送房间历史消息
        const roomMessages = Array.from(messageHistory.values())
          .filter(msg => msg.roomId === roomId);
        socket.emit('room_history', roomMessages);
      } catch (error) {
        console.error('Error joining room:', error);
        socket.emit('error', { message: 'Failed to join room' });
      }
    });

    socket.on('leave_room', (roomId) => {
      try {
        socket.leave(roomId);
        console.log(`User ${socket.id} left room: ${roomId}`);
      } catch (error) {
        console.error('Error leaving room:', error);
      }
    });

    socket.on('create_room', (room) => {
      try {
        socket.join(room.id);
        activeRooms.add(room.id);
        console.log(`Room created: ${room.id}`);
        io.emit('room_created', room);
      } catch (error) {
        console.error('Error creating room:', error);
        socket.emit('error', { message: 'Failed to create room' });
      }
    });

    socket.on('disconnect', () => {
      console.log('Client disconnected:', socket.id);
    });

    socket.on('error', (error) => {
      console.error('Socket error:', error);
      socket.emit('error', { message: 'An error occurred' });
    });
  });

  const PORT = process.env.PORT || 3000;
  server.listen(PORT, (err) => {
    if (err) throw err;
    console.log(`> Ready on http://localhost:${PORT}`);
  });
}); 