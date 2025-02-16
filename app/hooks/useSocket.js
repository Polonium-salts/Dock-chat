import { useEffect, useRef, useState, useCallback } from 'react';
import io from 'socket.io-client';

export const useSocket = (onMessageReceived) => {
  const [connected, setConnected] = useState(false);
  const socketRef = useRef(null);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;
  const messageQueue = useRef([]);

  const processMessageQueue = useCallback(() => {
    if (connected && messageQueue.current.length > 0) {
      console.log('Processing queued messages:', messageQueue.current.length);
      messageQueue.current.forEach(message => {
        socketRef.current.emit('message', message);
      });
      messageQueue.current = [];
    }
  }, [connected]);

  useEffect(() => {
    const connectSocket = () => {
      if (socketRef.current) {
        return;
      }

      // 使用环境变量或者当前域名
      const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || (
        process.env.NODE_ENV === 'production'
          ? window.location.origin
          : 'http://localhost:3000'
      );
      
      console.log('Connecting to socket server at:', socketUrl);

      socketRef.current = io(socketUrl, {
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: maxReconnectAttempts,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        timeout: 20000,
        autoConnect: true,
      });

      socketRef.current.on('connect', () => {
        console.log('Socket connected successfully');
        setConnected(true);
        reconnectAttempts.current = 0;
        processMessageQueue();
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
          // 尝试使用轮询
          if (socketRef.current.io.opts.transports.indexOf('polling') === -1) {
            console.log('Falling back to polling transport');
            socketRef.current.io.opts.transports = ['polling', 'websocket'];
          }
        }
      });

      socketRef.current.on('message', (message) => {
        console.log('Message received:', message);
        if (onMessageReceived) {
          onMessageReceived(message);
        }
      });

      socketRef.current.on('message_history', (messages) => {
        console.log('Received message history:', messages);
        messages.forEach(message => {
          if (onMessageReceived) {
            onMessageReceived(message);
          }
        });
      });

      socketRef.current.on('room_history', (messages) => {
        console.log('Received room history:', messages);
        messages.forEach(message => {
          if (onMessageReceived) {
            onMessageReceived(message);
          }
        });
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
  }, [onMessageReceived, processMessageQueue]);

  const sendMessage = async (message) => {
    if (!message) {
      console.warn('Attempted to send empty message');
      return false;
    }

    // 添加消息ID和时间戳
    const enhancedMessage = {
      ...message,
      id: Date.now().toString(),
      timestamp: new Date().toISOString(),
    };

    if (!socketRef.current || !connected) {
      console.warn('Socket not connected, queueing message');
      messageQueue.current.push(enhancedMessage);
      return false;
    }

    try {
      console.log('Sending message:', enhancedMessage);
      socketRef.current.emit('message', enhancedMessage);
      return true;
    } catch (error) {
      console.error('Error sending message:', error);
      messageQueue.current.push(enhancedMessage);
      return false;
    }
  };

  return {
    connected,
    sendMessage,
    socket: socketRef.current,
  };
}; 