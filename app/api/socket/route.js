import { Server } from 'socket.io';
import { NextResponse } from 'next/server';

// 使用 Map 来存储消息历史
if (!global.messageHistory) {
  global.messageHistory = new Map();
}

// 使用 Set 来存储活跃房间
if (!global.activeRooms) {
  global.activeRooms = new Set();
}

const ioHandler = (req) => {
  if (!global.io) {
    console.log('New Socket.io server...');
    global.io = new Server({
      cors: {
        origin: '*',
        methods: ['GET', 'POST'],
        credentials: true
      },
      addTrailingSlash: false,
      transports: ['websocket', 'polling'],
      connectionStateRecovery: {
        maxDisconnectionDuration: 2 * 60 * 1000,
        skipMiddlewares: true,
      },
      pingTimeout: 60000,
      pingInterval: 25000,
    });

    global.io.on('connection', (socket) => {
      console.log('Client connected:', socket.id);

      // 发送历史消息给新连接的客户端
      socket.emit('message_history', Array.from(global.messageHistory.values()));

      socket.on('message', (message) => {
        console.log('Received message:', message);
        
        try {
          // 确保消息有唯一ID
          const messageId = message.id || Date.now().toString();
          message.id = messageId;
          
          // 存储消息
          global.messageHistory.set(messageId, message);
          
          // 如果历史消息太多，删除旧消息
          if (global.messageHistory.size > 100) {
            const oldestKey = global.messageHistory.keys().next().value;
            global.messageHistory.delete(oldestKey);
          }

          // 广播消息给所有客户端
          global.io.emit('message', message);
          console.log('Message broadcasted successfully');
        } catch (error) {
          console.error('Error handling message:', error);
          socket.emit('error', { message: 'Failed to process message' });
        }
      });

      socket.on('join_room', (roomId) => {
        try {
          socket.join(roomId);
          global.activeRooms.add(roomId);
          console.log(`User ${socket.id} joined room: ${roomId}`);
          
          // 发送房间历史消息
          const roomMessages = Array.from(global.messageHistory.values())
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
          global.activeRooms.add(room.id);
          console.log(`Room created: ${room.id}`);
          global.io.emit('room_created', room);
        } catch (error) {
          console.error('Error creating room:', error);
          socket.emit('error', { message: 'Failed to create room' });
        }
      });

      socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id);
      });

      // 错误处理
      socket.on('error', (error) => {
        console.error('Socket error:', error);
        socket.emit('error', { message: 'An error occurred' });
      });
    });
  }

  // 处理 WebSocket 升级请求
  if (req.method === 'UPGRADE' && req.headers.get('upgrade') === 'websocket') {
    try {
      global.io.handleUpgrade(req, req.socket, Buffer.from([]));
      return new NextResponse(null, { status: 101 });
    } catch (err) {
      console.error('WebSocket upgrade failed:', err);
      return new NextResponse('WebSocket upgrade failed', { status: 400 });
    }
  }

  return new NextResponse('Socket.io server running', {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Allow-Credentials': 'true',
    },
  });
};

export const GET = ioHandler;
export const POST = ioHandler;

export const config = {
  api: {
    bodyParser: false,
  },
  runtime: 'edge',
}; 