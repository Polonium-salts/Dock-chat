import { Server } from 'socket.io';

let io;

// 存储在线用户
const onlineUsers = new Map();

export async function GET(request) {
  try {
    if (!io) {
      io = new Server(3001, {
        cors: {
          origin: '*',
          methods: ['GET', 'POST'],
        },
        path: '/api/socket',
        addTrailingSlash: false,
      });

      io.on('connection', (socket) => {
        console.log('User connected:', socket.id);

        // 用户加入
        socket.on('user:join', (username) => {
          onlineUsers.set(socket.id, { username, isTyping: false });
          io.emit('users:update', Array.from(onlineUsers.values()));
          io.emit('message:system', {
            content: `${username} 加入了聊天室`,
            timestamp: new Date().toISOString(),
          });
        });

        // 发送消息
        socket.on('message:send', (message) => {
          const messageWithId = {
            id: Date.now().toString(),
            user: message.user,
            content: message.content,
            timestamp: new Date().toISOString(),
            readBy: [socket.id],
          };
          io.emit('message:new', messageWithId);
        });

        // 消息已读
        socket.on('message:read', (messageId) => {
          io.emit('message:read:update', {
            messageId,
            userId: socket.id,
          });
        });

        // 正在输入状态
        socket.on('user:typing:start', () => {
          const user = onlineUsers.get(socket.id);
          if (user) {
            user.isTyping = true;
            io.emit('users:update', Array.from(onlineUsers.values()));
          }
        });

        socket.on('user:typing:stop', () => {
          const user = onlineUsers.get(socket.id);
          if (user) {
            user.isTyping = false;
            io.emit('users:update', Array.from(onlineUsers.values()));
          }
        });

        // 断开连接
        socket.on('disconnect', () => {
          const user = onlineUsers.get(socket.id);
          if (user) {
            io.emit('message:system', {
              content: `${user.username} 离开了聊天室`,
              timestamp: new Date().toISOString(),
            });
            onlineUsers.delete(socket.id);
            io.emit('users:update', Array.from(onlineUsers.values()));
          }
          console.log('User disconnected:', socket.id);
        });
      });
    }

    return new Response('Socket is running', {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST',
      },
    });
  } catch (error) {
    console.error('Socket initialization error:', error);
    return new Response('Internal Server Error', {
      status: 500,
    });
  }
}

export async function POST(request) {
  return GET(request);
} 