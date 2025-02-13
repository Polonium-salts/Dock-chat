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
    allowedHeaders: ["*"]
  },
  path: '/api/socket',
  transports: ['websocket', 'polling'],
  pingTimeout: 60000,
  pingInterval: 25000,
  maxHttpBufferSize: 1e8,
  allowEIO3: true,
  connectTimeout: 45000
});

// 存储连接的客户端和房间信息
const connectedClients = new Map();
const rooms = new Map();
const messagesByRoom = new Map();

// 初始化默认房间
rooms.set('general', { 
  id: 'general',
  name: '通用聊天室',
  isPublic: true,
  members: new Set(),
  messages: []
});

messagesByRoom.set('general', []);

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  
  // 存储用户信息
  let userInfo = null;

  socket.on('set_user_info', (info) => {
    userInfo = info;
    connectedClients.set(socket.id, { 
      rooms: new Set(['general']),
      userInfo: info
    });

    // 发送当前可用房间列表
    const availableRooms = Array.from(rooms.entries())
      .filter(([_, room]) => room.isPublic || room.createdBy === info.email)
      .map(([id, room]) => ({
        id,
        name: room.name,
        isPublic: room.isPublic,
        memberCount: room.members.size,
        createdBy: room.createdBy
      }));
    
    socket.emit('room_list', availableRooms);
  });

  // 加入默认房间
  socket.join('general');
  rooms.get('general').members.add(socket.id);
  console.log(`Socket ${socket.id} joined room: general`);

  // 发送默认房间的历史消息
  socket.emit('room_history', {
    roomId: 'general',
    messages: messagesByRoom.get('general') || []
  });

  // 处理创建房间请求
  socket.on('create_room', (roomData) => {
    try {
      console.log(`Creating new room:`, roomData);
      
      if (!roomData.name || !roomData.id) {
        throw new Error('Invalid room data');
      }

      if (!userInfo) {
        throw new Error('User info not set');
      }

      // 检查房间ID是否已存在
      if (rooms.has(roomData.id)) {
        throw new Error('Room ID already exists');
      }

      // 创建新房间
      const newRoom = {
        ...roomData,
        members: new Set([socket.id]),
        messages: [],
        createdBy: userInfo.email
      };
      
      rooms.set(roomData.id, newRoom);
      messagesByRoom.set(roomData.id, []);

      // 将创建者加入房间
      socket.join(roomData.id);
      connectedClients.get(socket.id).rooms.add(roomData.id);

      // 广播新房间创建消息
      if (roomData.isPublic) {
        io.emit('room_created', {
          id: roomData.id,
          name: roomData.name,
          isPublic: roomData.isPublic,
          memberCount: 1,
          createdBy: userInfo.email
        });
      }

      socket.emit('room_joined', { 
        roomId: roomData.id,
        messages: []
      });
      
      console.log(`Room created: ${roomData.id}`);
    } catch (error) {
      console.error('Error creating room:', error);
      socket.emit('error', { 
        message: 'Failed to create room',
        error: error.message 
      });
    }
  });

  socket.on('join_room', (roomId) => {
    try {
      if (!roomId) throw new Error('Room ID is required');
      
      if (!userInfo) {
        throw new Error('User info not set');
      }

      const room = rooms.get(roomId);
      if (!room) {
        throw new Error('Room not found');
      }

      if (!room.isPublic && room.createdBy !== userInfo.email) {
        throw new Error('Cannot join private room');
      }
      
      console.log(`Socket ${socket.id} joining room: ${roomId}`);
      socket.join(roomId);
      room.members.add(socket.id);
      connectedClients.get(socket.id).rooms.add(roomId);
      
      // 发送房间历史消息
      socket.emit('room_joined', { 
        roomId, 
        messages: messagesByRoom.get(roomId) || []
      });
      
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
      
      const room = rooms.get(roomId);
      if (!room) {
        throw new Error('Room not found');
      }
      
      console.log(`Socket ${socket.id} leaving room: ${roomId}`);
      socket.leave(roomId);
      room.members.delete(socket.id);
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
    // 从所有房间中移除该客户端
    const clientRooms = connectedClients.get(socket.id)?.rooms || new Set();
    for (const roomId of clientRooms) {
      const room = rooms.get(roomId);
      if (room) {
        room.members.delete(socket.id);
      }
    }
    connectedClients.delete(socket.id);
  });

  socket.on('message', (message) => {
    console.log('Received message from client:', message);
    try {
      // 确保消息包含必要的字段
      if (!message || !message.content || !message.user) {
        throw new Error('Invalid message format');
      }

      const roomId = message.roomId || 'general';
      
      // 检查房间是否存在
      if (!rooms.has(roomId)) {
        throw new Error('Room not found');
      }

      const enhancedMessage = {
        ...message,
        id: Date.now().toString(),
        timestamp: message.timestamp || new Date().toISOString(),
        socketId: socket.id,
        roomId: roomId
      };
      
      // 存储消息
      if (!messagesByRoom.has(roomId)) {
        messagesByRoom.set(roomId, []);
      }
      messagesByRoom.get(roomId).push(enhancedMessage);
      
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

  socket.on('error', (error) => {
    console.error(`Socket error (${socket.id}):`, error);
  });
});

// 增强错误处理
io.engine.on('connection_error', (err) => {
  console.error('Connection error:', err);
});

process.on('uncaughtException', (err) => {
  console.error('Uncaught exception:', err);
});

process.on('unhandledRejection', (err) => {
  console.error('Unhandled rejection:', err);
});

const PORT = process.env.SOCKET_PORT || 3001;
httpServer.listen(PORT, () => {
  console.log(`Socket.IO server running on port ${PORT}`);
}); 