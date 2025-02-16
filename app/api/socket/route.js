import { Server } from 'socket.io';
import { NextResponse } from 'next/server';

const ioHandler = (req) => {
  if (!global.io) {
    console.log('New Socket.io server...');
    global.io = new Server({
      path: '/socket.io',
      addTrailingSlash: false,
      cors: {
        origin: '*',
        methods: ['GET', 'POST'],
      },
      transports: ['websocket', 'polling'],
      allowEIO3: true,
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

  return new NextResponse('Socket.io server running', {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST',
    },
  });
};

export const GET = ioHandler;
export const POST = ioHandler;

export const config = {
  api: {
    bodyParser: false,
  },
}; 