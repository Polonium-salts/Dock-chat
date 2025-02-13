const { createServer } = require('http');
const { Server } = require('socket.io');
const { parse } = require('url');

function startSocketServer() {
  const httpServer = createServer((req, res) => {
    const parsedUrl = parse(req.url, true);
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Socket.IO server');
  });

  const io = new Server(httpServer, {
    cors: {
      origin: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3001",
      methods: ["GET", "POST"],
      credentials: true,
      allowedHeaders: ["*"]
    },
    transports: ['websocket', 'polling'],
    allowEIO3: true,
    pingTimeout: 60000,
    pingInterval: 25000,
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
      console.log('Setting user info:', info);
      userInfo = info;
      connectedClients.set(socket.id, { 
        rooms: new Set(['general']),
        userInfo: info
      });

      // 发送房间列表
      const roomList = Array.from(rooms.entries()).map(([id, room]) => ({
        id,
        name: room.name,
        isPublic: room.isPublic,
        memberCount: room.members.size
      }));
      console.log('Sending room list:', roomList);
      socket.emit('room_list', roomList);

      // 加入默认房间
      socket.join('general');
      rooms.get('general').members.add(socket.id);
      
      // 发送默认房间的历史消息
      const generalMessages = messagesByRoom.get('general') || [];
      console.log('Sending general room messages:', generalMessages);
      socket.emit('room_joined', {
        roomId: 'general',
        messages: generalMessages
      });
    });

    socket.on('create_room', (roomData) => {
      try {
        console.log('Creating room:', roomData);
        if (!roomData.name || !roomData.id) {
          throw new Error('Invalid room data');
        }

        // 创建新房间
        const newRoom = {
          ...roomData,
          members: new Set([socket.id]),
          messages: []
        };
        rooms.set(roomData.id, newRoom);
        messagesByRoom.set(roomData.id, []);

        // 加入新房间
        socket.join(roomData.id);
        connectedClients.get(socket.id).rooms.add(roomData.id);

        // 广播新房间创建消息
        if (roomData.isPublic) {
          io.emit('room_created', roomData);
        }

        // 发送加入确认
        socket.emit('room_joined', {
          roomId: roomData.id,
          messages: []
        });

        console.log('Room created successfully:', roomData.id);
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
        console.log('Joining room:', roomId);
        if (!roomId) throw new Error('Room ID is required');
        
        const room = rooms.get(roomId);
        if (!room) {
          throw new Error('Room not found');
        }

        if (!room.isPublic && room.createdBy !== userInfo?.email) {
          throw new Error('Cannot join private room');
        }
        
        // 加入房间
        socket.join(roomId);
        room.members.add(socket.id);
        
        // 更新客户端房间列表
        if (connectedClients.has(socket.id)) {
          connectedClients.get(socket.id).rooms.add(roomId);
        }
        
        // 发送房间历史消息
        const roomMessages = messagesByRoom.get(roomId) || [];
        console.log('Sending room messages:', roomId, roomMessages);
        socket.emit('room_joined', {
          roomId,
          messages: roomMessages
        });
        
        console.log('Successfully joined room:', roomId);
      } catch (error) {
        console.error('Error joining room:', error);
        socket.emit('error', { 
          message: 'Failed to join room',
          error: error.message 
        });
      }
    });

    socket.on('message', (message) => {
      try {
        console.log('Received message:', message);
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
        
        // 广播消息到指定房间
        console.log('Broadcasting message to room:', roomId);
        io.to(roomId).emit('message', enhancedMessage);
        
        console.log('Message sent successfully');
      } catch (error) {
        console.error('Error processing message:', error);
        socket.emit('error', { 
          message: 'Failed to process message',
          error: error.message 
        });
      }
    });

    socket.on('disconnect', () => {
      console.log('Client disconnected:', socket.id);
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

    socket.on('error', (error) => {
      console.error('Socket error:', error);
    });
  });

  // 错误处理
  io.engine.on('connection_error', (error) => {
    console.error('Connection error:', error);
  });

  process.on('uncaughtException', (error) => {
    console.error('Uncaught exception:', error);
  });

  process.on('unhandledRejection', (error) => {
    console.error('Unhandled rejection:', error);
  });

  const PORT = process.env.SOCKET_PORT || 3001;
  httpServer.listen(PORT, () => {
    console.log(`Socket.IO server running on port ${PORT}`);
  });

  return httpServer;
}

// 如果直接运行此文件，则启动服务器
if (require.main === module) {
  startSocketServer();
}

module.exports = startSocketServer; 