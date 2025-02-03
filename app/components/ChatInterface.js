'use client';

import { useState, useEffect } from 'react';
import { useSession, signOut } from 'next-auth/react';
import Parser from 'rss-parser';
import { AIChat } from '../services/aiChat';
import AIConfig from './AIConfig';
import { useLanguage, useTranslation } from './LanguageProvider';
import { pusherClient } from '../lib/pusher';

export default function ChatInterface() {
  const { data: session } = useSession();
  const { language, changeLanguage } = useLanguage();
  const translate = useTranslation();
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [rssUrl, setRssUrl] = useState('');
  const [rssFeeds, setRssFeeds] = useState([]);
  const [activeTab, setActiveTab] = useState('chat');
  const [aiConfig, setAiConfig] = useState(null);
  const [isAiTyping, setIsAiTyping] = useState(false);
  const [aiMessages, setAiMessages] = useState([]);
  const [aiNewMessage, setAiNewMessage] = useState('');
  const [aiChats, setAiChats] = useState([]);
  const [currentChatId, setCurrentChatId] = useState(null);
  const [settings, setSettings] = useState({
    theme: 'light',
    messageSound: true,
    desktopNotifications: false,
    fontSize: 'medium',
    language: 'en',
  });
  const [activeSettingSection, setActiveSettingSection] = useState('ai');
  const [rooms, setRooms] = useState([]);
  const [currentRoom, setCurrentRoom] = useState(null);
  const [showCreateRoom, setShowCreateRoom] = useState(false);
  const [showJoinRoom, setShowJoinRoom] = useState(false);
  const [newRoomName, setNewRoomName] = useState('');
  const [roomIdToJoin, setRoomIdToJoin] = useState('');

  // Initialize AI chat service
  useEffect(() => {
    const savedChats = localStorage.getItem('aiChats');
    if (savedChats) {
      setAiChats(JSON.parse(savedChats));
    }
    const savedConfig = localStorage.getItem('aiConfig');
    if (savedConfig) {
      setAiConfig(JSON.parse(savedConfig));
    }
  }, []);

  // Save chat history to localStorage
  useEffect(() => {
    localStorage.setItem('aiChats', JSON.stringify(aiChats));
  }, [aiChats]);

  // Initialize settings
  useEffect(() => {
    const savedSettings = localStorage.getItem('settings');
    if (savedSettings) {
      setSettings(JSON.parse(savedSettings));
    }
  }, []);

  // Save settings to localStorage
  const handleSaveSettings = (newSettings) => {
    setSettings(newSettings);
    localStorage.setItem('settings', JSON.stringify(newSettings));
    if (newSettings.language !== settings.language) {
      changeLanguage(newSettings.language);
    }
  };

  // Create a new chat
  const createNewChat = () => {
    const newChat = {
      id: Date.now(),
      title: 'New Chat',
      messages: [],
      timestamp: new Date().toISOString(),
    };
    setAiChats(prev => [newChat, ...prev]);
    setCurrentChatId(newChat.id);
    setAiMessages([]);
  };

  // Load rooms
  useEffect(() => {
    const loadRooms = async () => {
      try {
        const response = await fetch('/api/rooms');
        if (response.ok) {
          const data = await response.json();
          setRooms(data);
        }
      } catch (error) {
        console.error('Error loading rooms:', error);
      }
    };

    if (activeTab === 'chat') {
      loadRooms();
    }
  }, [activeTab]);

  // Subscribe to room messages
  useEffect(() => {
    if (!currentRoom) return;

    const channel = pusherClient.subscribe(`room-${currentRoom.id}`);
    
    channel.bind('new-message', (message) => {
      if (message.user.email !== session?.user?.email) {
        setMessages((prev) => [...prev, message]);
      }
    });

    channel.bind('member-joined', (data) => {
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now(),
          content: `${data.user.name} joined the room`,
          user: { name: 'System', email: 'system@system', image: '/system-avatar.png' },
          timestamp: data.timestamp,
        },
      ]);
    });

    return () => {
      pusherClient.unsubscribe(`room-${currentRoom.id}`);
    };
  }, [currentRoom, session]);

  const handleCreateRoom = async (e) => {
    e.preventDefault();
    if (!newRoomName.trim()) return;

    try {
      const response = await fetch('/api/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newRoomName }),
      });

      if (response.ok) {
        const room = await response.json();
        setRooms((prev) => [...prev, room]);
        setCurrentRoom(room);
        setShowCreateRoom(false);
        setNewRoomName('');
        setMessages([]);
      }
    } catch (error) {
      console.error('Error creating room:', error);
    }
  };

  const handleJoinRoom = async (e) => {
    e.preventDefault();
    if (!roomIdToJoin.trim()) return;

    try {
      const response = await fetch('/api/rooms/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomId: roomIdToJoin }),
      });

      if (response.ok) {
        const room = await response.json();
        if (!rooms.find(r => r.id === room.id)) {
          setRooms((prev) => [...prev, room]);
        }
        setCurrentRoom(room);
        setShowJoinRoom(false);
        setRoomIdToJoin('');
        setMessages([]);
      }
    } catch (error) {
      console.error('Error joining room:', error);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !currentRoom) return;

    const userMessage = {
      content: newMessage,
      roomId: currentRoom.id,
    };

    try {
      const response = await fetch('/api/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userMessage),
      });

      if (!response.ok) {
        throw new Error('Failed to send message');
      }

      const message = await response.json();
      setMessages((prev) => [...prev, message]);
      setNewMessage('');

      // If AI is configured, get AI response
      if (aiConfig && (aiConfig.deepseek.enabled || aiConfig.kimi.enabled)) {
        setIsAiTyping(true);
        try {
          const aiChatService = new AIChat(aiConfig);
          const aiResponse = await aiChatService.chat(newMessage);
          
          const aiMessage = {
            id: Date.now() + 1,
            content: aiResponse.content,
            user: {
              name: `AI (${aiResponse.source})`,
              image: '/ai-avatar.png',
              email: 'ai@system',
            },
            timestamp: new Date().toISOString(),
          };

          setMessages((prev) => [...prev, aiMessage]);
        } catch (error) {
          console.error('AI chat error:', error);
          const errorMessage = {
            id: Date.now() + 1,
            content: `AI Error: ${error.message}`,
            user: {
              name: 'System',
              image: '/system-avatar.png',
              email: 'system@system',
            },
            timestamp: new Date().toISOString(),
          };
          setMessages((prev) => [...prev, errorMessage]);
        } finally {
          setIsAiTyping(false);
        }
      }
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  const handleSaveAiConfig = (config) => {
    setAiConfig(config);
    localStorage.setItem('aiConfig', JSON.stringify(config));
    setActiveTab('ai');  // 修改这里：保存后跳转到 AI Chat 界面
  };

  const handleAddRssFeed = async (e) => {
    e.preventDefault();
    if (!rssUrl.trim()) return;

    try {
      const parser = new Parser();
      const feed = await parser.parseURL(rssUrl);
      setRssFeeds((prev) => [...prev, {
        title: feed.title,
        items: feed.items.slice(0, 5),
        url: rssUrl,
      }]);
      setRssUrl('');
    } catch (error) {
      console.error('Error parsing RSS feed:', error);
      alert('Error parsing RSS feed. Please check the URL and try again.');
    }
  };

  const handleSendAiMessage = async (e) => {
    e.preventDefault();
    if (!aiNewMessage.trim()) return;

    // If no current chat, create a new one
    if (!currentChatId) {
      createNewChat();
    }

    const userMessage = {
      id: Date.now(),
      content: aiNewMessage,
      user: session.user,
      timestamp: new Date().toISOString(),
    };

    // Update current message list and chat history
    setAiMessages(prev => [...prev, userMessage]);
    setAiChats(prev => prev.map(chat => {
      if (chat.id === currentChatId) {
        // Update chat title to first message's first 20 characters
        const newTitle = chat.messages.length === 0 ? aiNewMessage.slice(0, 20) + '...' : chat.title;
        return {
          ...chat,
          title: newTitle,
          messages: [...chat.messages, userMessage],
        };
      }
      return chat;
    }));

    setAiNewMessage('');

    if (aiConfig && (aiConfig.deepseek.enabled || aiConfig.kimi.enabled)) {
      setIsAiTyping(true);
      try {
        const aiChatService = new AIChat(aiConfig);
        const aiResponse = await aiChatService.chat(aiNewMessage);
        
        const aiMessage = {
          id: Date.now() + 1,
          content: aiResponse.content,
          user: {
            name: `AI (${aiResponse.source})`,
            image: '/ai-avatar.svg',
            email: 'ai@system',
          },
          timestamp: new Date().toISOString(),
        };

        setAiMessages(prev => [...prev, aiMessage]);
        setAiChats(prev => prev.map(chat => {
          if (chat.id === currentChatId) {
            return {
              ...chat,
              messages: [...chat.messages, aiMessage],
            };
          }
          return chat;
        }));
      } catch (error) {
        console.error('AI chat error:', error);
        const errorMessage = {
          id: Date.now() + 1,
          content: `AI Error: ${error.message}`,
          user: {
            name: 'System',
            image: '/system-avatar.svg',
            email: 'system@system',
          },
          timestamp: new Date().toISOString(),
        };
        setAiMessages(prev => [...prev, errorMessage]);
        setAiChats(prev => prev.map(chat => {
          if (chat.id === currentChatId) {
            return {
              ...chat,
              messages: [...chat.messages, errorMessage],
            };
          }
          return chat;
        }));
      } finally {
        setIsAiTyping(false);
      }
    } else {
      const errorMessage = {
        id: Date.now() + 1,
        content: 'Please configure AI settings first',
        user: {
          name: 'System',
          image: '/system-avatar.svg',
          email: 'system@system',
        },
        timestamp: new Date().toISOString(),
      };
      setAiMessages(prev => [...prev, errorMessage]);
      setAiChats(prev => prev.map(chat => {
        if (chat.id === currentChatId) {
          return {
            ...chat,
            messages: [...chat.messages, errorMessage],
          };
        }
        return chat;
      }));
    }
  };

  return (
    <div className="flex h-screen w-full bg-white">
      {/* Left Navigation Bar */}
      <nav className="flex-none w-16 bg-white border-r border-gray-200">
        <div className="h-full flex flex-col items-center py-4">
          {/* User Avatar */}
          <div className="mb-8">
            <img
              src={session.user.image}
              alt={session.user.name}
              className="w-10 h-10 rounded-full border-2 border-white shadow-sm hover:opacity-80 transition-opacity"
            />
          </div>

          {/* Navigation Buttons */}
          <div className="flex flex-col gap-2">
            <button
              onClick={() => setActiveTab('chat')}
              className={`p-2 rounded-lg transition-colors ${
                activeTab === 'chat'
                  ? 'bg-blue-50 text-blue-600'
                  : 'text-gray-500 hover:bg-gray-100'
              }`}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </button>
            <button
              onClick={() => setActiveTab('ai')}
              className={`p-2 rounded-lg transition-colors ${
                activeTab === 'ai'
                  ? 'bg-purple-50 text-purple-600'
                  : 'text-gray-500 hover:bg-gray-100'
              }`}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </button>
            <button
              onClick={() => setActiveTab('rss')}
              className={`p-2 rounded-lg transition-colors ${
                activeTab === 'rss'
                  ? 'bg-blue-50 text-blue-600'
                  : 'text-gray-500 hover:bg-gray-100'
              }`}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 5c7.18 0 13 5.82 13 13M6 11a7 7 0 017 7m-6 0a1 1 0 11-2 0 1 1 0 012 0z" />
              </svg>
            </button>
            <button
              onClick={() => setActiveTab('settings')}
              className={`p-2 rounded-lg transition-colors ${
                activeTab === 'settings'
                  ? 'bg-gray-100 text-gray-900'
                  : 'text-gray-500 hover:bg-gray-100'
              }`}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>
          </div>

          {/* Sign Out Button */}
          <button
            onClick={() => signOut()}
            className="mt-auto p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          </button>
        </div>
      </nav>

      {/* Left Sidebar */}
      <aside className="flex-none w-72 border-r border-gray-200 bg-white">
        <div className="h-full flex flex-col">
          {activeTab === 'chat' ? (
            <>
              <div className="p-4 border-b border-gray-200">
                <div className="space-y-2">
                  <button
                    onClick={() => setShowCreateRoom(true)}
                    className="w-full px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
                  >
                    Create Room
                  </button>
                  <button
                    onClick={() => setShowJoinRoom(true)}
                    className="w-full px-4 py-2 text-sm font-medium text-blue-600 border border-blue-600 rounded-lg hover:bg-blue-50"
                  >
                    Join Room
                  </button>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-4">
                <div className="space-y-2">
                  {rooms.map((room) => (
                    <button
                      key={room.id}
                      onClick={() => {
                        setCurrentRoom(room);
                        setMessages([]);
                      }}
                      className={`w-full p-3 text-left rounded-lg transition-colors ${
                        currentRoom?.id === room.id
                          ? 'bg-blue-50 text-blue-900 border border-blue-200'
                          : 'hover:bg-gray-50 text-gray-700 border border-transparent'
                      }`}
                    >
                      <div className="font-medium">{room.name}</div>
                      <div className="text-xs text-gray-500 mt-1">
                        {room.members.length} members
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Create Room Modal */}
              {showCreateRoom && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                  <div className="bg-white rounded-lg p-6 w-96">
                    <h3 className="text-lg font-semibold mb-4">Create New Room</h3>
                    <form onSubmit={handleCreateRoom}>
                      <input
                        type="text"
                        value={newRoomName}
                        onChange={(e) => setNewRoomName(e.target.value)}
                        placeholder="Room Name"
                        className="w-full px-3 py-2 border rounded-lg mb-4"
                      />
                      <div className="flex justify-end space-x-2">
                        <button
                          type="button"
                          onClick={() => setShowCreateRoom(false)}
                          className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                        >
                          Create
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}

              {/* Join Room Modal */}
              {showJoinRoom && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                  <div className="bg-white rounded-lg p-6 w-96">
                    <h3 className="text-lg font-semibold mb-4">Join Room</h3>
                    <form onSubmit={handleJoinRoom}>
                      <input
                        type="text"
                        value={roomIdToJoin}
                        onChange={(e) => setRoomIdToJoin(e.target.value)}
                        placeholder="Room ID"
                        className="w-full px-3 py-2 border rounded-lg mb-4"
                      />
                      <div className="flex justify-end space-x-2">
                        <button
                          type="button"
                          onClick={() => setShowJoinRoom(false)}
                          className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                        >
                          Join
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}
            </>
          ) : activeTab === 'settings' ? (
            <>
              <div className="p-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">{translate('settings.title')}</h2>
              </div>
              <div className="flex-1 overflow-y-auto p-4">
                <div className="space-y-2">
                  <button
                    onClick={() => setActiveSettingSection('ai')}
                    className={`w-full p-3 text-left rounded-lg transition-colors ${
                      activeSettingSection === 'ai'
                        ? 'bg-purple-50 text-purple-900 border border-purple-200'
                        : 'hover:bg-gray-50 text-gray-700 border border-transparent'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                      <span>{translate('settings.ai')}</span>
                    </div>
                  </button>
                  <button
                    onClick={() => setActiveSettingSection('appearance')}
                    className={`w-full p-3 text-left rounded-lg transition-colors ${
                      activeSettingSection === 'appearance'
                        ? 'bg-purple-50 text-purple-900 border border-purple-200'
                        : 'hover:bg-gray-50 text-gray-700 border border-transparent'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
                      </svg>
                      <span>{translate('settings.appearance')}</span>
                    </div>
                  </button>
                  <button
                    onClick={() => setActiveSettingSection('notifications')}
                    className={`w-full p-3 text-left rounded-lg transition-colors ${
                      activeSettingSection === 'notifications'
                        ? 'bg-purple-50 text-purple-900 border border-purple-200'
                        : 'hover:bg-gray-50 text-gray-700 border border-transparent'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                      </svg>
                      <span>{translate('settings.notifications')}</span>
                    </div>
                  </button>
                  <button
                    onClick={() => setActiveSettingSection('about')}
                    className={`w-full p-3 text-left rounded-lg transition-colors ${
                      activeSettingSection === 'about'
                        ? 'bg-purple-50 text-purple-900 border border-purple-200'
                        : 'hover:bg-gray-50 text-gray-700 border border-transparent'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span>{translate('settings.about')}</span>
                    </div>
                  </button>
                </div>
              </div>
            </>
          ) : activeTab === 'aiconfig' ? (
            <div className="h-full p-4">
              <AIConfig onSave={handleSaveAiConfig} config={aiConfig} />
            </div>
          ) : (
            <>
              <div className="p-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">
                  {activeTab === 'chat' ? translate('chat.title') : 
                   activeTab === 'rss' ? translate('rss.title') :
                   translate('ai.title')}
                </h2>
              </div>

              {activeTab === 'chat' ? (
                <div className="flex-1 overflow-y-auto p-4">
                  <div className="text-sm text-gray-500 text-center">No messages yet</div>
                </div>
              ) : activeTab === 'ai' ? (
                <div className="flex-1 flex flex-col">
                  <div className="p-4 border-b border-gray-200">
                    <button
                      onClick={createNewChat}
                      className="w-full px-4 py-2 text-sm font-medium text-white bg-purple-600 rounded-lg hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    >
                      {translate('ai.newChat')}
                    </button>
                  </div>
                  <div className="flex-1 overflow-y-auto p-4">
                    {aiChats.length === 0 ? (
                      <div className="text-sm text-gray-600 text-center">No chat history</div>
                    ) : (
                      <div className="space-y-2">
                        {aiChats.map((chat) => (
                          <button
                            key={chat.id}
                            onClick={() => {
                              setCurrentChatId(chat.id);
                              setAiMessages(chat.messages);
                            }}
                            className={`w-full p-3 text-left rounded-lg transition-colors ${
                              currentChatId === chat.id
                                ? 'bg-purple-100 text-purple-900 border border-purple-200'
                                : 'hover:bg-gray-50 text-gray-700 border border-transparent'
                            }`}
                          >
                            <div className="text-sm font-medium truncate">{chat.title}</div>
                            <div className="text-xs text-gray-600 mt-1">
                              {new Date(chat.timestamp).toLocaleDateString()}
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <form onSubmit={handleAddRssFeed} className="space-y-2">
                    <input
                      type="url"
                      value={rssUrl}
                      onChange={(e) => setRssUrl(e.target.value)}
                      placeholder="Enter RSS URL..."
                      className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <button
                      type="submit"
                      className="w-full px-3 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      {translate('rss.addFeed')}
                    </button>
                  </form>

                  <div className="space-y-3">
                    {rssFeeds.map((feed, index) => (
                      <div key={index} className="p-3 bg-gray-50 rounded-lg">
                        <h4 className="font-medium text-sm mb-2">{feed.title}</h4>
                        <ul className="space-y-1">
                          {feed.items.map((item, itemIndex) => (
                            <li key={itemIndex}>
                              <a
                                href={item.link}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-sm text-blue-600 hover:text-blue-800 hover:underline block truncate"
                              >
                                {item.title}
                              </a>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 bg-gray-50">
        <header className="flex-none h-16 bg-white border-b border-gray-200">
          <div className="h-full px-6 flex items-center justify-between">
            <div>
              <h1 className="text-xl font-semibold text-gray-900">
                {currentRoom ? currentRoom.name : 'Select a Room'}
              </h1>
              {currentRoom && (
                <p className="text-sm text-gray-500">
                  {currentRoom.members.length} members
                </p>
              )}
            </div>
          </div>
        </header>

        {activeTab === 'settings' ? (
          <div className="flex-1 overflow-y-auto">
            <div className="max-w-3xl mx-auto p-6">
              <div className="bg-white rounded-lg shadow-sm">
                {activeSettingSection === 'ai' && (
                  <div className="p-6 border-b border-gray-200">
                    <h2 className="text-lg font-semibold text-gray-900 mb-4">{translate('settings.ai')}</h2>
                    <AIConfig onSave={handleSaveAiConfig} config={aiConfig} />
                  </div>
                )}

                {activeSettingSection === 'appearance' && (
                  <div className="p-6 border-b border-gray-200">
                    <h2 className="text-lg font-semibold text-gray-900 mb-4">{translate('settings.appearance')}</h2>
                    <div className="space-y-4">
                      {/* Theme Setting */}
                      <div className="flex items-center justify-between">
                        <label className="text-sm font-medium text-gray-700">{translate('appearance.theme')}</label>
                        <select
                          value={settings.theme}
                          onChange={(e) => handleSaveSettings({ ...settings, theme: e.target.value })}
                          className="ml-4 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white text-gray-900"
                        >
                          <option value="light">{translate('appearance.themes.light')}</option>
                          <option value="dark">{translate('appearance.themes.dark')}</option>
                          <option value="system">{translate('appearance.themes.system')}</option>
                        </select>
                      </div>

                      {/* Language Setting */}
                      <div className="flex items-center justify-between">
                        <label className="text-sm font-medium text-gray-700">{translate('appearance.language')}</label>
                        <select
                          value={settings.language}
                          onChange={(e) => handleSaveSettings({ ...settings, language: e.target.value })}
                          className="ml-4 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white text-gray-900"
                        >
                          <option value="en">English</option>
                          <option value="zh-CN">中文</option>
                        </select>
                      </div>

                      {/* Font Size Setting */}
                      <div className="flex items-center justify-between">
                        <label className="text-sm font-medium text-gray-700">{translate('appearance.fontSize')}</label>
                        <select
                          value={settings.fontSize}
                          onChange={(e) => handleSaveSettings({ ...settings, fontSize: e.target.value })}
                          className="ml-4 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white text-gray-900"
                        >
                          <option value="small">{translate('appearance.fontSizes.small')}</option>
                          <option value="medium">{translate('appearance.fontSizes.medium')}</option>
                          <option value="large">{translate('appearance.fontSizes.large')}</option>
                        </select>
                      </div>
                    </div>
                  </div>
                )}

                {activeSettingSection === 'notifications' && (
                  <div className="p-6 border-b border-gray-200">
                    <h2 className="text-lg font-semibold text-gray-900 mb-4">{translate('settings.notifications')}</h2>
                    <div className="space-y-4">
                      {/* Message Sound Setting */}
                      <div className="flex items-center justify-between">
                        <label className="text-sm font-medium text-gray-700">{translate('settings.messageSound')}</label>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={settings.messageSound}
                            onChange={(e) => handleSaveSettings({ ...settings, messageSound: e.target.checked })}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                        </label>
                      </div>

                      {/* Desktop Notifications Setting */}
                      <div className="flex items-center justify-between">
                        <label className="text-sm font-medium text-gray-700">{translate('settings.desktopNotifications')}</label>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={settings.desktopNotifications}
                            onChange={(e) => handleSaveSettings({ ...settings, desktopNotifications: e.target.checked })}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                        </label>
                      </div>
                    </div>
                  </div>
                )}

                {activeSettingSection === 'about' && (
                  <div className="p-6 border-b border-gray-200">
                    <h2 className="text-lg font-semibold text-gray-900 mb-4">{translate('settings.about')}</h2>
                    <div className="space-y-4">
                      <div className="text-sm text-gray-600">
                        <p>Version: 1.0.0</p>
                        <p className="mt-2">{translate('settings.aboutDescription')}</p>
                        <p className="mt-4">{translate('settings.copyright')}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : activeTab === 'chat' ? (
          <>
            <div className="flex-1 overflow-y-auto">
              <div className="max-w-3xl mx-auto p-6 space-y-6">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.user.email === session.user.email ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`flex max-w-[70%] ${message.user.email === session.user.email ? 'flex-row-reverse' : 'flex-row'} items-end space-x-2`}>
                      <img
                        src={message.user.image}
                        alt={message.user.name}
                        className="w-8 h-8 rounded-full"
                      />
                      <div>
                        <div className={`px-4 py-2 rounded-2xl ${
                          message.user.email === session.user.email
                            ? 'bg-blue-600 text-white rounded-br-none'
                            : 'bg-white border border-gray-200 text-gray-900 rounded-bl-none'
                        }`}>
                          {message.content}
                        </div>
                        <div className={`mt-1 flex items-center space-x-2 ${
                          message.user.email === session.user.email ? 'justify-end' : 'justify-start'
                        }`}>
                          <span className="text-xs text-gray-500">
                            {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex-none bg-white border-t border-gray-200 p-4">
              <form onSubmit={handleSendMessage} className="max-w-3xl mx-auto flex items-center space-x-4">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder={isAiTyping ? "AI is typing..." : "Type a message..."}
                  disabled={isAiTyping}
                  className="flex-1 px-4 py-2 bg-gray-50 border border-gray-200 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                />
                <button
                  type="submit"
                  disabled={isAiTyping}
                  className="p-2 text-blue-600 hover:bg-blue-50 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                </button>
              </form>
            </div>
          </>
        ) : activeTab === 'ai' ? (
          <>
            <div className="flex-1 overflow-y-auto">
              <div className="max-w-3xl mx-auto p-6 space-y-6">
                {aiMessages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.user.email === session.user.email ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`flex max-w-[70%] ${message.user.email === session.user.email ? 'flex-row-reverse' : 'flex-row'} items-end space-x-2`}>
                      <img
                        src={message.user.image}
                        alt={message.user.name}
                        className="w-8 h-8 rounded-full border border-gray-200"
                      />
                      <div>
                        <div className={`px-4 py-2 rounded-2xl ${
                          message.user.email === session.user.email
                            ? 'bg-purple-600 text-white rounded-br-none shadow-sm'
                            : message.user.email === 'ai@system'
                            ? 'bg-emerald-50 border border-emerald-200 text-gray-900 rounded-bl-none shadow-sm'
                            : message.user.email === 'system@system'
                            ? 'bg-red-50 border border-red-200 text-gray-900 rounded-bl-none shadow-sm'
                            : 'bg-white border border-gray-200 text-gray-900 rounded-bl-none shadow-sm'
                        }`}>
                          {message.content}
                        </div>
                        <div className={`mt-1 flex items-center space-x-2 ${
                          message.user.email === session.user.email ? 'justify-end' : 'justify-start'
                        }`}>
                          <span className="text-xs text-gray-600">
                            {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                {isAiTyping && (
                  <div className="flex justify-start">
                    <div className="flex items-center space-x-2 bg-white border border-gray-200 rounded-lg shadow-sm p-3">
                      <img src="/ai-avatar.svg" alt="AI" className="w-6 h-6 rounded-full border border-gray-200" />
                      <div className="text-gray-700">{translate('ai.typing')}</div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="flex-none bg-white border-t border-gray-200 p-4">
              <form onSubmit={handleSendAiMessage} className="max-w-3xl mx-auto flex items-center space-x-4">
                <input
                  type="text"
                  value={aiNewMessage}
                  onChange={(e) => setAiNewMessage(e.target.value)}
                  placeholder={isAiTyping ? "AI is typing..." : "Ask AI anything..."}
                  disabled={isAiTyping}
                  className="flex-1 px-4 py-2 bg-gray-50 border border-gray-200 rounded-full focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-50"
                />
                <button
                  type="submit"
                  disabled={isAiTyping}
                  className="p-2 text-purple-600 hover:bg-purple-50 rounded-full focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-50"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                </button>
              </form>
            </div>
          </>
        ) : (
          <div className="flex-1 overflow-y-auto p-6">
            <div className="max-w-3xl mx-auto">
              {rssFeeds.length === 0 ? (
                <div className="text-center text-gray-500">
                  <svg className="w-16 h-16 mx-auto mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 5c7.18 0 13 5.82 13 13M6 11a7 7 0 017 7m-6 0a1 1 0 11-2 0 1 1 0 012 0z" />
                  </svg>
                  <p>{translate('rss.noFeeds')}</p>
                  <p className="text-sm mt-2">{translate('rss.addFeedDescription')}</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {rssFeeds.map((feed, index) => (
                    <div key={index} className="bg-white rounded-lg shadow-sm p-6">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">{feed.title}</h3>
                      <div className="space-y-4">
                        {feed.items.map((item, itemIndex) => (
                          <a
                            key={itemIndex}
                            href={item.link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                          >
                            <h4 className="text-base font-medium text-gray-900">{item.title}</h4>
                            {item.contentSnippet && (
                              <p className="mt-1 text-sm text-gray-600 line-clamp-2">{item.contentSnippet}</p>
                            )}
                          </a>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
} 