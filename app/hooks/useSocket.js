import { useEffect, useRef, useState, useCallback } from 'react';
import io from 'socket.io-client';

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3001';

export function useSocket(onMessageReceived) {
  const [connected, setConnected] = useState(false);
  const socketRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const messageQueueRef = useRef([]);

  const connect = useCallback(() => {
    try {
      if (socketRef.current?.connected) {
        return;
      }

      // 清理现有连接
      if (socketRef.current) {
        socketRef.current.removeAllListeners();
        socketRef.current.disconnect();
      }

      console.log('Connecting to Socket.IO server:', SOCKET_URL);
      
      socketRef.current = io(SOCKET_URL, {
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 3000,
        reconnectionDelayMax: 10000,
        timeout: 20000,
        autoConnect: false,
        withCredentials: true
      });

      socketRef.current.on('connect', () => {
        console.log('Socket.IO connected with ID:', socketRef.current.id);
        setConnected(true);
        
        // Send queued messages
        while (messageQueueRef.current.length > 0) {
          const queuedMessage = messageQueueRef.current.shift();
          console.log('Sending queued message:', queuedMessage);
          socketRef.current.emit('message', queuedMessage);
        }
      });

      socketRef.current.on('message', (message) => {
        console.log('Received message:', message);
        if (onMessageReceived && typeof onMessageReceived === 'function') {
          onMessageReceived(message);
        }
      });

      socketRef.current.on('room_list', (rooms) => {
        console.log('Received room list:', rooms);
      });

      socketRef.current.on('room_joined', ({ roomId, messages }) => {
        console.log('Joined room:', roomId, 'with messages:', messages);
        if (messages && messages.length > 0) {
          messages.forEach(message => {
            if (onMessageReceived && typeof onMessageReceived === 'function') {
              onMessageReceived(message);
            }
          });
        }
      });

      socketRef.current.on('connect_error', (error) => {
        console.error('Socket.IO connection error:', error);
        setConnected(false);
        
        if (!reconnectTimeoutRef.current) {
          reconnectTimeoutRef.current = setTimeout(() => {
            reconnectTimeoutRef.current = null;
            connect();
          }, 3000);
        }
      });

      socketRef.current.on('disconnect', (reason) => {
        console.log('Socket.IO disconnected:', reason);
        setConnected(false);
        
        if (reason === 'io server disconnect' || reason === 'transport close') {
          console.log('Attempting to reconnect...');
          setTimeout(() => connect(), 3000);
        }
      });

      socketRef.current.on('error', (error) => {
        console.error('Socket.IO error:', error);
        setConnected(false);
      });

      // 强制连接
      socketRef.current.connect();

    } catch (error) {
      console.error('Failed to initialize Socket.IO:', error);
      setConnected(false);
      
      if (!reconnectTimeoutRef.current) {
        reconnectTimeoutRef.current = setTimeout(() => {
          reconnectTimeoutRef.current = null;
          connect();
        }, 3000);
      }
    }
  }, [onMessageReceived]);

  useEffect(() => {
    connect();

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
      
      if (socketRef.current) {
        console.log('Cleaning up socket connection');
        socketRef.current.removeAllListeners();
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, [connect]);

  const sendMessage = useCallback((message) => {
    if (!message) {
      console.warn('Attempted to send empty message');
      return;
    }

    const messageWithTimestamp = {
      ...message,
      timestamp: message.timestamp || new Date().toISOString(),
    };

    console.log('Attempting to send message:', messageWithTimestamp);

    try {
      if (socketRef.current?.connected) {
        console.log('Socket is connected, sending message directly');
        socketRef.current.emit('message', messageWithTimestamp);
      } else {
        console.log('Socket not connected, queueing message');
        messageQueueRef.current.push(messageWithTimestamp);
        
        // 尝试重新连接
        console.log('Attempting to reconnect...');
        connect();
      }
    } catch (error) {
      console.error('Error sending message:', error);
      messageQueueRef.current.push(messageWithTimestamp);
      
      // 尝试重新连接
      connect();
    }
  }, [connect]);

  const setUserInfo = useCallback((userInfo) => {
    if (socketRef.current?.connected) {
      console.log('Setting user info:', userInfo);
      socketRef.current.emit('set_user_info', userInfo);
    } else {
      console.log('Socket not connected, will set user info after connection');
      const checkConnection = setInterval(() => {
        if (socketRef.current?.connected) {
          console.log('Socket now connected, setting user info');
          socketRef.current.emit('set_user_info', userInfo);
          clearInterval(checkConnection);
        }
      }, 1000);

      // 5秒后清除检查
      setTimeout(() => clearInterval(checkConnection), 5000);
    }
  }, []);

  return {
    connected,
    sendMessage,
    setUserInfo,
    socket: socketRef.current,
  };
} 