import { useEffect, useRef, useState } from 'react';
import io from 'socket.io-client';

export const useSocket = (onMessageReceived) => {
  const [connected, setConnected] = useState(false);
  const socketRef = useRef(null);

  useEffect(() => {
    if (!socketRef.current) {
      const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || window.location.origin;
      socketRef.current = io(socketUrl, {
        path: '/socket.io',
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
      });

      socketRef.current.on('connect', () => {
        console.log('Socket connected');
        setConnected(true);
      });

      socketRef.current.on('disconnect', () => {
        console.log('Socket disconnected');
        setConnected(false);
      });

      socketRef.current.on('message', (message) => {
        console.log('Message received:', message);
        if (onMessageReceived) {
          onMessageReceived(message);
        }
      });

      socketRef.current.on('error', (error) => {
        console.error('Socket error:', error);
        setConnected(false);
      });
    }

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, [onMessageReceived]);

  const sendMessage = async (message) => {
    if (socketRef.current && connected) {
      socketRef.current.emit('message', message);
      return true;
    }
    return false;
  };

  return {
    connected,
    sendMessage,
    socket: socketRef.current,
  };
}; 