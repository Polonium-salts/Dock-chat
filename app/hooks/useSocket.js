import { useEffect, useRef, useState } from 'react';
import io from 'socket.io-client';

export const useSocket = (onMessageReceived) => {
  const [connected, setConnected] = useState(false);
  const socketRef = useRef(null);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;

  useEffect(() => {
    const connectSocket = () => {
      if (socketRef.current) {
        return;
      }

      const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || window.location.origin;
      console.log('Connecting to socket server at:', socketUrl);

      socketRef.current = io(socketUrl, {
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: maxReconnectAttempts,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        timeout: 20000,
        autoConnect: true,
        withCredentials: true,
      });

      socketRef.current.on('connect', () => {
        console.log('Socket connected successfully');
        setConnected(true);
        reconnectAttempts.current = 0;
      });

      socketRef.current.on('disconnect', (reason) => {
        console.log('Socket disconnected:', reason);
        setConnected(false);
      });

      socketRef.current.on('connect_error', (error) => {
        console.error('Connection error:', error);
        reconnectAttempts.current += 1;
        
        if (reconnectAttempts.current >= maxReconnectAttempts) {
          console.log('Max reconnection attempts reached');
          socketRef.current.disconnect();
        } else {
          console.log(`Reconnection attempt ${reconnectAttempts.current}/${maxReconnectAttempts}`);
        }
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
    };

    connectSocket();

    return () => {
      if (socketRef.current) {
        console.log('Cleaning up socket connection');
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, [onMessageReceived]);

  const sendMessage = async (message) => {
    if (!message) {
      console.warn('Attempted to send empty message');
      return false;
    }

    if (!socketRef.current || !connected) {
      console.warn('Socket not connected, cannot send message');
      return false;
    }

    try {
      socketRef.current.emit('message', message);
      return true;
    } catch (error) {
      console.error('Error sending message:', error);
      return false;
    }
  };

  return {
    connected,
    sendMessage,
    socket: socketRef.current,
  };
}; 