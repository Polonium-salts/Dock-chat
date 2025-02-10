import { useEffect, useRef, useState, useCallback } from 'react';
import io from 'socket.io-client';

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3001';

export function useSocket() {
  const [messages, setMessages] = useState([]);
  const [connected, setConnected] = useState(false);
  const socketRef = useRef(null);

  useEffect(() => {
    const initSocket = async () => {
      try {
        if (socketRef.current) {
          socketRef.current.disconnect();
        }

        // 初始化Socket.IO连接
        const response = await fetch('/api/socket');
        if (!response.ok) {
          throw new Error('Failed to initialize socket connection');
        }
        
        socketRef.current = io(SOCKET_URL, {
          path: '/api/socket',
          addTrailingSlash: false,
          reconnectionAttempts: 5,
          reconnectionDelay: 1000,
          reconnectionDelayMax: 5000,
          transports: ['websocket', 'polling'],
        });

        socketRef.current.on('connect', () => {
          console.log('Connected to socket server');
          setConnected(true);
        });

        socketRef.current.on('connect_error', (error) => {
          console.error('Socket connection error:', error.message);
          setConnected(false);
        });

        socketRef.current.on('message', (message) => {
          console.log('Received message:', message);
          if (message && typeof message === 'object') {
            setMessages((prev) => {
              const messageExists = prev.some(
                (m) => 
                  m.timestamp === message.timestamp && 
                  m.user.email === message.user.email &&
                  m.content === message.content
              );
              if (messageExists) {
                return prev;
              }
              return [...prev, message];
            });
          }
        });

        socketRef.current.on('disconnect', (reason) => {
          console.log('Disconnected from socket server:', reason);
          setConnected(false);
        });

        socketRef.current.on('error', (error) => {
          console.error('Socket error:', error);
          setConnected(false);
        });
      } catch (error) {
        console.error('Failed to initialize socket:', error.message);
        setConnected(false);
      }
    };

    initSocket();

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, []);

  const sendMessage = useCallback((message) => {
    if (!socketRef.current) {
      console.warn('Socket not initialized');
      return;
    }
    
    if (!connected) {
      console.warn('Socket not connected');
      return;
    }

    try {
      console.log('Sending message:', message);
      socketRef.current.emit('message', message);
    } catch (error) {
      console.error('Error sending message:', error.message);
    }
  }, [connected]);

  return {
    messages,
    connected,
    sendMessage,
  };
} 