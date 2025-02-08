import { useEffect, useRef, useState, useCallback } from 'react';
import io from 'socket.io-client';

export const useSocket = () => {
  const [connected, setConnected] = useState(false);
  const [messages, setMessages] = useState([]);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const socketRef = useRef();
  const typingTimeoutRef = useRef();

  useEffect(() => {
    const initSocket = async () => {
      try {
        await fetch('/api/socket');
        
        const socket = io('ws://localhost:3001', {
          path: '/api/socket',
          transports: ['websocket'],
          reconnectionAttempts: 5,
          reconnectionDelay: 1000,
        });

        socket.on('connect', () => {
          console.log('Connected to server');
          setConnected(true);
        });

        socket.on('message:new', (message) => {
          setMessages((prev) => [...prev, message]);
          // 标记消息为已读
          socket.emit('message:read', message.id);
        });

        socket.on('message:system', (message) => {
          setMessages((prev) => [...prev, { ...message, isSystem: true }]);
        });

        socket.on('message:read:update', ({ messageId, userId }) => {
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === messageId
                ? { ...msg, readBy: [...new Set([...msg.readBy, userId])] }
                : msg
            )
          );
        });

        socket.on('users:update', (users) => {
          setOnlineUsers(users);
        });

        socket.on('disconnect', () => {
          console.log('Disconnected from server');
          setConnected(false);
        });

        socket.on('connect_error', (error) => {
          console.error('Connection error:', error);
          setConnected(false);
        });

        socketRef.current = socket;
      } catch (error) {
        console.error('Socket initialization error:', error);
        setConnected(false);
      }
    };

    initSocket();

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, []);

  const joinChat = useCallback((username) => {
    if (socketRef.current) {
      socketRef.current.emit('user:join', username);
    }
  }, []);

  const sendMessage = useCallback((message) => {
    if (socketRef.current) {
      socketRef.current.emit('message:send', message);
    }
  }, []);

  const startTyping = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.emit('user:typing:start');
      
      // 清除之前的超时
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }

      // 3秒后自动停止输入状态
      typingTimeoutRef.current = setTimeout(() => {
        if (socketRef.current) {
          socketRef.current.emit('user:typing:stop');
        }
      }, 3000);
    }
  }, []);

  const stopTyping = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.emit('user:typing:stop');
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    }
  }, []);

  return {
    connected,
    messages,
    onlineUsers,
    joinChat,
    sendMessage,
    startTyping,
    stopTyping,
  };
}; 