import { useEffect, useState, useCallback } from 'react';
import { pusherClient } from '../lib/pusher';

export function useSocket(onMessageReceived) {
  const [connected, setConnected] = useState(false);
  const [currentRoom, setCurrentRoom] = useState(null);

  const joinRoom = useCallback(async (roomId) => {
    if (currentRoom) {
      pusherClient.unsubscribe(`presence-room-${currentRoom}`);
    }

    const roomChannel = pusherClient.subscribe(`presence-room-${roomId}`);
    setCurrentRoom(roomId);

    roomChannel.bind('message', (message) => {
      if (onMessageReceived && typeof onMessageReceived === 'function') {
        onMessageReceived(message);
      }
    });

    try {
      await fetch(`/api/rooms/join`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ roomId }),
      });
    } catch (error) {
      console.error('Error joining room:', error);
    }
  }, [currentRoom, onMessageReceived]);

  const leaveRoom = useCallback(async (roomId) => {
    if (roomId) {
      pusherClient.unsubscribe(`presence-room-${roomId}`);
      setCurrentRoom(null);

      try {
        await fetch(`/api/rooms/leave`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ roomId }),
        });
      } catch (error) {
        console.error('Error leaving room:', error);
      }
    }
  }, []);

  const sendMessage = useCallback(async (message) => {
    if (!message) {
      console.warn('Attempted to send empty message');
      return;
    }

    const messageWithTimestamp = {
      ...message,
      timestamp: message.timestamp || new Date().toISOString(),
    };

    try {
      const response = await fetch('/api/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(messageWithTimestamp),
      });

      if (!response.ok) {
        throw new Error('Failed to send message');
      }
    } catch (error) {
      console.error('Error sending message:', error);
    }
  }, []);

  const createRoom = useCallback(async (roomData) => {
    try {
      const response = await fetch('/api/rooms/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(roomData),
      });

      if (!response.ok) {
        throw new Error('Failed to create room');
      }

      const data = await response.json();
      await joinRoom(roomData.id);
      return data.room;
    } catch (error) {
      console.error('Error creating room:', error);
      throw error;
    }
  }, [joinRoom]);

  useEffect(() => {
    setConnected(true);

    // 订阅全局消息频道
    const channel = pusherClient.subscribe('presence-chat');

    channel.bind('message', (message) => {
      if (onMessageReceived && typeof onMessageReceived === 'function') {
        onMessageReceived(message);
      }
    });

    channel.bind('pusher:subscription_succeeded', () => {
      setConnected(true);
    });

    channel.bind('pusher:subscription_error', () => {
      setConnected(false);
    });

    return () => {
      channel.unbind_all();
      pusherClient.unsubscribe('presence-chat');
    };
  }, [onMessageReceived]);

  return {
    connected,
    sendMessage,
    createRoom,
    joinRoom,
    leaveRoom,
    currentRoom,
  };
} 