import { Server } from 'socket.io';
import { NextResponse } from 'next/server';

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
    });

    global.io.on('connection', (socket) => {
      console.log('Client connected');

      socket.on('message', (message) => {
        // Broadcast the message to all connected clients
        global.io.emit('message', message);
      });

      socket.on('join_room', (roomId) => {
        socket.join(roomId);
        console.log(`User joined room: ${roomId}`);
      });

      socket.on('leave_room', (roomId) => {
        socket.leave(roomId);
        console.log(`User left room: ${roomId}`);
      });

      socket.on('create_room', (room) => {
        socket.join(room.id);
        console.log(`Room created: ${room.id}`);
        global.io.emit('room_created', room);
      });

      socket.on('disconnect', () => {
        console.log('Client disconnected');
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