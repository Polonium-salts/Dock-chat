'use client';

import { useState, useEffect } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Parser from 'rss-parser';
import { AIChat } from '../services/aiChat';
import AIConfig from './AIConfig';
import MusicConfig from './MusicConfig';
import { useLanguage, useTranslation } from './LanguageProvider';
import MusicPlayer from './MusicPlayer';
import { RssService } from '../services/rssService';
import { useSocket } from '../hooks/useSocket';

export default function ChatInterface() {
  const router = useRouter();
  const { data: session, status } = useSession();
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
  const [currentLyrics, setCurrentLyrics] = useState(null);
  const [isLoadingFeed, setIsLoadingFeed] = useState(false);
  const [rssError, setRssError] = useState(null);
  const [discoveredFeeds, setDiscoveredFeeds] = useState([]);
  const [isDiscovering, setIsDiscovering] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('articles');
  const [feedCategory, setFeedCategory] = useState('articles');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isNavVisible, setIsNavVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);
  const [chatRooms, setChatRooms] = useState([
    { id: 'general', name: '通用聊天室', unread: 0 },
    { id: 'tech', name: '技术交流', unread: 2 },
    { id: 'casual', name: '休闲娱乐', unread: 0 }
  ]);
  const [currentRoom, setCurrentRoom] = useState('general');
  const [messagesByRoom, setMessagesByRoom] = useState({});
  
  const { connected, sendMessage: sendSocketMessage } = useSocket((message) => {
    console.log('Message received in ChatInterface:', message);
    
    // 确保消息有房间ID
    const roomId = message.roomId || currentRoom;
    
    setMessagesByRoom(prev => {
      const roomMessages = prev[roomId] || [];
      
      // 检查消息是否已存在
      const messageExists = roomMessages.some(
        m => 
          m.timestamp === message.timestamp && 
          m.user.email === message.user.email &&
          m.content === message.content
      );
      
      if (messageExists) {
        console.log('Duplicate message detected, skipping');
        return prev;
      }

      console.log('Adding new message to room:', roomId);
      const newMessages = [...roomMessages, message];
      
      return {
        ...prev,
        [roomId]: newMessages
      };
    });

    // 更新未读消息计数
    if (message.user.email !== session?.user?.email) {
      setChatRooms(rooms =>
        rooms.map(room =>
          room.id === roomId
            ? room
            : { ...room, unread: (room.unread || 0) + 1 }
        )
      );
    }
  });

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      setIsNavVisible(currentScrollY <= lastScrollY || currentScrollY < 50);
      setLastScrollY(currentScrollY);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [lastScrollY]);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  if (status === 'loading' || !session) {
    return (
      <div className="flex h-screen items-center justify-center bg-white">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

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

  useEffect(() => {
    localStorage.setItem('aiChats', JSON.stringify(aiChats));
  }, [aiChats]);

  useEffect(() => {
    const savedSettings = localStorage.getItem('settings');
    if (savedSettings) {
      setSettings(JSON.parse(savedSettings));
    }
  }, []);

  const handleSaveSettings = (newSettings) => {
    setSettings(newSettings);
    localStorage.setItem('settings', JSON.stringify(newSettings));
    if (newSettings.language !== settings.language) {
      changeLanguage(newSettings.language);
    }
  };

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

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    if (activeTab === 'chat') {
      const userMessage = {
        content: newMessage.trim(),
        user: {
          name: session.user.name,
          email: session.user.email,
          image: session.user.image || '/default-avatar.png'
        },
        timestamp: new Date().toISOString(),
        roomId: currentRoom,
      };

      console.log('Sending message:', userMessage);
      
      // 立即添加消息到本地状态
      setMessagesByRoom(prev => ({
        ...prev,
        [currentRoom]: [...(prev[currentRoom] || []), userMessage]
      }));

      // 发送消息
      try {
        await sendSocketMessage(userMessage);
        console.log('Message sent successfully');
      } catch (error) {
        console.error('Failed to send message:', error);
        // 可以在这里添加错误提示
      }

      // 清空输入框
      setNewMessage('');
    } else if (activeTab === 'ai') {
      const userMessage = {
        id: Date.now(),
        content: newMessage,
        user: session.user,
        timestamp: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, userMessage]);
      setNewMessage('');

      if (aiConfig && (aiConfig.deepseek.enabled || aiConfig.kimi.enabled)) {
        setIsAiTyping(true);
        try {
          const aiChatService = new AIChat(aiConfig);
          const aiResponse = await aiChatService.chat(newMessage);
          
          const aiMessage = {
            content: aiResponse.content,
            user: {
              name: `AI (${aiResponse.source})`,
              image: '/ai-avatar.png',
            },
            timestamp: new Date().toISOString(),
          };

          setMessages((prev) => [...prev, aiMessage]);
        } catch (error) {
          console.error('AI chat error:', error);
          const errorMessage = {
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
    }
  };

  const handleSaveAiConfig = (config) => {
    setAiConfig(config);
    localStorage.setItem('aiConfig', JSON.stringify(config));
    setActiveTab('ai');
  };

  useEffect(() => {
    const savedFeeds = localStorage.getItem('rssFeeds');
    if (savedFeeds) {
      setRssFeeds(JSON.parse(savedFeeds));
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('rssFeeds', JSON.stringify(rssFeeds));
  }, [rssFeeds]);

  const handleAddRssFeed = async (e) => {
    e.preventDefault();
    if (!rssUrl.trim()) {
      return;
    }

    setIsLoadingFeed(true);
    setRssError(null);
    setDiscoveredFeeds([]);

    try {
      let normalizedUrl = rssUrl;
      if (!normalizedUrl.startsWith('http')) {
        normalizedUrl = 'https://' + normalizedUrl;
      }

      const response = await fetch('/api/rss/discover', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url: normalizedUrl }),
        credentials: 'same-origin'
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to discover RSS feeds');
      }

      const data = await response.json();

      if (!data.feeds || data.feeds.length === 0) {
        throw new Error(translate('rss.noFeedsFound'));
      }

      if (rssFeeds.some(f => data.feeds.some(newFeed => newFeed.url === f.url))) {
        throw new Error(translate('rss.feedExists'));
      }

      const firstFeed = data.feeds[0];
      
      const feedResponse = await fetch('/api/rss/fetch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url: firstFeed.url }),
        credentials: 'same-origin'
      });

      if (!feedResponse.ok) {
        throw new Error('Failed to fetch feed content');
      }

      const feedData = await feedResponse.json();
      
      setRssFeeds(prev => [...prev, {
        id: Date.now(),
        title: feedData.title || firstFeed.title || 'RSS Feed',
        description: feedData.description || '',
        url: firstFeed.url,
        category: 'articles',
        items: (feedData.items || []).map(item => ({
          id: item.guid || item.link || Date.now().toString(),
          title: item.title,
          link: item.link,
          date: item.pubDate || item.isoDate,
          content: item.contentSnippet || item.content || item['content:encoded'] || item.description || '',
        })).slice(0, 10)
      }]);

      setRssUrl('');
      setDiscoveredFeeds(data.feeds.slice(1));

    } catch (error) {
      console.error('Error handling RSS feed:', error);
      setRssError(error.message || 'Failed to add RSS feed');
    } finally {
      setIsLoadingFeed(false);
    }
  };

  const handleSelectDiscoveredFeed = async (feed) => {
    setIsLoadingFeed(true);
    setRssError(null);
    try {
      if (rssFeeds.some(f => f.url === feed.url)) {
        throw new Error(translate('rss.feedExists'));
      }

      const feedResponse = await fetch('/api/rss/fetch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url: feed.url }),
        credentials: 'same-origin'
      });

      if (!feedResponse.ok) {
        throw new Error('Failed to fetch feed content');
      }

      const feedData = await feedResponse.json();
      
      setRssFeeds(prev => [...prev, {
        id: Date.now(),
        title: feedData.title || feed.title || 'RSS Feed',
        description: feedData.description || '',
        url: feed.url,
        category: 'articles',
        items: (feedData.items || []).map(item => ({
          id: item.guid || item.link || Date.now().toString(),
          title: item.title,
          link: item.link,
          date: item.pubDate || item.isoDate,
          content: item.contentSnippet || item.content || item['content:encoded'] || item.description || '',
        })).slice(0, 10)
      }]);

      setRssUrl('');
      setDiscoveredFeeds([]);
    } catch (error) {
      console.error('Error adding discovered feed:', error);
      setRssError(error.message || 'Failed to add RSS feed');
    } finally {
      setIsLoadingFeed(false);
    }
  };

  const handleRemoveFeed = (feedId) => {
    setRssFeeds(prev => prev.filter(feed => feed.id !== feedId));
  };

  const handleRefreshFeed = async (feed) => {
    setIsLoadingFeed(true);
    try {
      const parser = new Parser();
      const updatedFeed = await parser.parseURL(feed.url);
      
      setRssFeeds(prev => prev.map(f => {
        if (f.id === feed.id) {
          return {
            ...f,
            title: updatedFeed.title,
            description: updatedFeed.description,
            items: updatedFeed.items.map(item => ({
              id: item.guid || item.link,
              title: item.title,
              link: item.link,
              date: item.pubDate || item.isoDate,
              content: item.contentSnippet || item.content,
            })).slice(0, 10)
          };
        }
        return f;
      }));
    } catch (error) {
      console.error('Error refreshing feed:', error);
      setRssError(error.message);
    } finally {
      setIsLoadingFeed(false);
    }
  };

  const handleSendAiMessage = async (e) => {
    e.preventDefault();
    if (!aiNewMessage.trim()) return;

    if (!currentChatId) {
      createNewChat();
    }

    const userMessage = {
      id: Date.now(),
      content: aiNewMessage,
      user: session.user,
      timestamp: new Date().toISOString(),
    };

    setAiMessages(prev => [...prev, userMessage]);
    setAiChats(prev => prev.map(chat => {
      if (chat.id === currentChatId) {
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

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setIsSidebarOpen(false);
  };

  const handleRoomChange = (roomId) => {
    setCurrentRoom(roomId);
    setChatRooms(rooms => 
      rooms.map(room => 
        room.id === roomId ? { ...room, unread: 0 } : room
      )
    );
  };

  const handleCreateRoom = () => {
    const roomName = prompt(translate('chat.enterRoomName'));
    if (roomName) {
      const newRoom = {
        id: Date.now().toString(),
        name: roomName,
        unread: 0
      };
      setChatRooms([...chatRooms, newRoom]);
      setCurrentRoom(newRoom.id);
    }
  };

  return (
    <div className="flex h-screen w-full bg-white flex-col md:flex-row">
      <header className="md:hidden flex-none h-16 bg-white border-b border-gray-200 fixed top-0 left-0 right-0 z-50">
        <div className="h-full px-4 flex items-center justify-between">
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="p-2 rounded-lg text-gray-600 hover:bg-gray-100"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {isSidebarOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
          <h1 className="text-lg font-semibold text-gray-900">
            {activeTab === 'chat' ? translate('chat.title') : 
             activeTab === 'ai' ? translate('ai.title') :
             activeTab === 'rss' ? translate('rss.title') :
             activeTab === 'music' ? translate('settings.music') :
             activeTab === 'settings' ? translate('settings.title') :
             translate('settings.ai')}
          </h1>
          <div className="w-10 h-10 rounded-full overflow-hidden">
            <img
              src={session.user.image}
              alt={session.user.name}
              className="w-full h-full object-cover"
            />
          </div>
        </div>
      </header>

      <nav className={`flex-none md:w-16 h-16 md:h-full bg-white border-t md:border-t-0 md:border-r border-gray-200 fixed bottom-0 md:relative w-full z-50 transition-transform duration-300 ${
        isNavVisible ? 'translate-y-0' : 'translate-y-full md:translate-y-0'
      }`}>
        <div className="h-full flex md:flex-col items-center justify-around md:justify-start md:py-4">
          <div className="hidden md:block mb-8">
            <img
              src={session.user.image}
              alt={session.user.name}
              className="w-10 h-10 rounded-full border-2 border-white shadow-sm hover:opacity-80 transition-opacity"
            />
          </div>

          <div className="flex md:flex-col gap-2 items-center justify-around w-full md:w-auto">
            <button
              onClick={() => handleTabChange('chat')}
              className={`p-2 rounded-lg transition-colors ${
                activeTab === 'chat'
                  ? 'bg-blue-50 text-blue-600'
                  : 'text-gray-500 hover:bg-gray-100'
              }`}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
              </svg>
              <span className="text-xs mt-1 hidden">{translate('chat.title')}</span>
            </button>
            <button
              onClick={() => handleTabChange('ai')}
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
              onClick={() => handleTabChange('rss')}
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
              onClick={() => handleTabChange('music')}
              className={`p-2 rounded-lg transition-colors ${
                activeTab === 'music'
                  ? 'bg-purple-50 text-purple-600'
                  : 'text-gray-500 hover:bg-gray-100'
              }`}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2z" />
              </svg>
            </button>
            <button
              onClick={() => handleTabChange('settings')}
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

          <button
            onClick={() => signOut()}
            className="hidden md:block mt-auto p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          </button>
        </div>
      </nav>

      <aside className={`flex-none w-full md:w-72 border-r border-gray-200 bg-white fixed md:relative z-40 transition-transform duration-300 transform ${
        isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
      } h-[calc(100vh-4rem)] md:h-full top-16 md:top-0`}>
        <div className="h-full flex flex-col">
          {activeTab === 'settings' ? (
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
                  <button
                    onClick={() => setActiveSettingSection('music')}
                    className={`w-full p-3 text-left rounded-lg transition-colors ${
                      activeSettingSection === 'music'
                        ? 'bg-purple-50 text-purple-900 border border-purple-200'
                        : 'hover:bg-gray-50 text-gray-700 border border-transparent'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2z" />
                      </svg>
                      <span>{translate('settings.music')}</span>
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
                   activeTab === 'ai' ? translate('ai.title') :
                   activeTab === 'rss' ? translate('rss.title') :
                   activeTab === 'music' ? translate('settings.music') :
                   activeTab === 'settings' ? translate('settings.title') :
                   translate('settings.ai')}
                </h2>
              </div>

              {activeTab === 'chat' ? (
                <>
                  <div className="p-4 border-b border-gray-200">
                    <div className="flex items-center justify-between">
                      <h2 className="text-lg font-semibold text-gray-900">{translate('chat.title')}</h2>
                      <button
                        onClick={handleCreateRoom}
                        className="p-1.5 text-gray-500 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                        title={translate('chat.createRoom')}
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                        </svg>
                      </button>
                    </div>
                  </div>
                  <div className="flex-1 overflow-y-auto p-2">
                    <div className="space-y-1">
                      {chatRooms.map(room => (
                        <button
                          key={room.id}
                          onClick={() => handleRoomChange(room.id)}
                          className={`w-full px-3 py-2 flex items-center justify-between rounded-lg transition-colors ${
                            currentRoom === room.id
                              ? 'bg-purple-50 text-purple-900'
                              : 'text-gray-700 hover:bg-gray-50'
                          }`}
                        >
                          <div className="flex items-center">
                            <span className="text-sm font-medium">{room.name}</span>
                          </div>
                          {room.unread > 0 && (
                            <span className="flex-none ml-2 px-2 py-0.5 text-xs font-medium text-white bg-purple-600 rounded-full">
                              {room.unread}
                            </span>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="flex-none p-4 border-t border-gray-200">
                    <div className="flex items-center space-x-3">
                      <div className="flex-none">
                        <div className="w-2 h-2 rounded-full bg-green-500"></div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-gray-900 truncate">
                          {session.user.name || session.user.email}
                        </div>
                        <div className="text-xs text-gray-500">
                          {connected ? translate('chat.online') : translate('chat.offline')}
                        </div>
                      </div>
                    </div>
                  </div>
                </>
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
              ) : activeTab === 'music' ? (
                <div className="flex-1 flex flex-col">
                  <div className="flex-1 overflow-y-auto p-4 lyrics-container">
                    {currentLyrics?.lrc ? (
                      <pre className="text-sm text-gray-600 whitespace-pre-wrap text-center">
                        {currentLyrics.lrc}
                      </pre>
                    ) : (
                      <div className="h-full flex items-center justify-center">
                        <div className="text-sm text-gray-500 text-center">
                          {translate('music.noTrackPlaying')}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ) : activeTab === 'rss' ? (
                <div className="flex-1 flex flex-col">
                  <div className="p-4 border-b border-gray-200">
                    <div className="flex items-center space-x-4">
                      <button
                        onClick={() => setSelectedCategory('articles')}
                        className={`p-2 rounded-lg transition-colors ${
                          selectedCategory === 'articles'
                            ? 'bg-blue-100 text-blue-800'
                            : 'text-gray-600 hover:bg-gray-100'
                        }`}
                        title={translate('rss.categories.articles')}
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9.5a2.5 2.5 0 00-2.5-2.5H14" />
                        </svg>
                      </button>
                      <button
                        onClick={() => setSelectedCategory('social')}
                        className={`p-2 rounded-lg transition-colors ${
                          selectedCategory === 'social'
                            ? 'bg-blue-100 text-blue-800'
                            : 'text-gray-600 hover:bg-gray-100'
                        }`}
                        title={translate('rss.categories.social')}
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => setSelectedCategory('images')}
                        className={`p-2 rounded-lg transition-colors ${
                          selectedCategory === 'images'
                            ? 'bg-blue-100 text-blue-800'
                            : 'text-gray-600 hover:bg-gray-100'
                        }`}
                        title={translate('rss.categories.images')}
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => setSelectedCategory('videos')}
                        className={`p-2 rounded-lg transition-colors ${
                          selectedCategory === 'videos'
                            ? 'bg-blue-100 text-blue-800'
                            : 'text-gray-600 hover:bg-gray-100'
                        }`}
                        title={translate('rss.categories.videos')}
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => setSelectedCategory('audio')}
                        className={`p-2 rounded-lg transition-colors ${
                          selectedCategory === 'audio'
                            ? 'bg-blue-100 text-blue-800'
                            : 'text-gray-600 hover:bg-gray-100'
                        }`}
                        title={translate('rss.categories.audio')}
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2z" />
                        </svg>
                      </button>
                    </div>
                  </div>
                  <div className="flex-1 overflow-y-auto p-4">
                    <div className="space-y-4">
                      {rssFeeds
                        .filter(feed => selectedCategory === feed.category)
                        .map((feed) => (
                          <div
                            key={feed.id}
                            className="p-3 bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow"
                          >
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center space-x-2">
                                <h3 className="font-medium text-gray-900 truncate">{feed.title}</h3>
                                <span className="px-2 py-0.5 text-xs font-medium text-blue-800 bg-blue-100 rounded-full">
                                  {translate(`rss.categories.${feed.category}`)}
                                </span>
                              </div>
                              <div className="flex items-center space-x-1">
                                <button
                                  onClick={() => handleRefreshFeed(feed)}
                                  className="p-1 text-gray-400 hover:text-blue-600 rounded-full transition-colors"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                  </svg>
                                </button>
                                <button
                                  onClick={() => handleRemoveFeed(feed.id)}
                                  className="p-1 text-gray-400 hover:text-red-600 rounded-full transition-colors"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                  </svg>
                                </button>
                              </div>
                            </div>
                            {feed.description && (
                              <p className="text-xs text-gray-500 truncate">{feed.description}</p>
                            )}
                            <div className="mt-2 text-xs text-gray-400">
                              {feed.items.length} {translate('rss.articles')}
                            </div>
                          </div>
                        ))}
                    </div>

                    <div className="mt-4">
                      <form onSubmit={handleAddRssFeed} className="space-y-2">
                        <div className="flex items-center space-x-2">
                          <input
                            type="url"
                            value={rssUrl}
                            onChange={(e) => setRssUrl(e.target.value)}
                            placeholder={translate('rss.enterUrl')}
                            className="flex-1 px-3 py-2 text-sm bg-white border border-gray-200 rounded-lg placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                          <button
                            type="submit"
                            disabled={isLoadingFeed}
                            className="px-3 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 w-10 h-10 flex items-center justify-center"
                          >
                            {isLoadingFeed ? (
                              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            ) : (
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                              </svg>
                            )}
                          </button>
                        </div>
                        {rssError && (
                          <div className="px-3 py-2 text-sm text-red-600 bg-red-50 rounded-lg">
                            {rssError}
                          </div>
                        )}
                      </form>

                      {discoveredFeeds.length > 0 && (
                        <div className="mt-4 space-y-2">
                          <h4 className="text-sm font-medium text-gray-700">{translate('rss.discoveredFeeds')}</h4>
                          <div className="space-y-2">
                            {discoveredFeeds.map((feed, index) => (
                              <button
                                key={index}
                                onClick={() => handleSelectDiscoveredFeed(feed)}
                                className="w-full p-2 text-left bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                              >
                                  <div className="text-sm font-medium text-gray-900">{feed.title}</div>
                                  <div className="text-xs text-gray-500 truncate">{feed.url}</div>
                                </button>
                              ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ) : null}
            </>
          )}
        </div>
      </aside>

      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-30 md:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      <main className="flex-1 flex flex-col h-[calc(100vh-8rem)] md:h-screen overflow-hidden mt-16 md:mt-0 mb-16 md:mb-0">
        <header className="flex-none h-16 bg-white border-b border-gray-200">
          <div className="h-full px-6 flex items-center justify-between">
            <h1 className="text-xl font-semibold text-gray-900">
              {activeTab === 'chat' ? translate('chat.title') : 
               activeTab === 'ai' ? translate('ai.title') :
               activeTab === 'rss' ? translate('rss.title') :
               activeTab === 'music' ? translate('settings.music') :
               activeTab === 'settings' ? translate('settings.title') :
               translate('settings.ai')}
            </h1>
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

                {activeSettingSection === 'music' && (
                  <div className="p-6 border-b border-gray-200">
                    <h2 className="text-lg font-semibold text-gray-900 mb-4">{translate('settings.music')}</h2>
                    <MusicConfig />
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : activeTab === 'chat' ? (
          <>
            <div className="flex-1 overflow-y-auto">
              <div className="max-w-3xl mx-auto p-6 space-y-6">
                <div className="text-center text-sm text-gray-500 pb-4 border-b border-gray-200">
                  {chatRooms.find(room => room.id === currentRoom)?.name}
                </div>
                {(messagesByRoom[currentRoom] || []).map((message, index) => (
                  <div
                    key={`${currentRoom}-${index}`}
                    className={`flex ${
                      message.user.email === session?.user?.email ? 'justify-end' : 'justify-start'
                    } mb-4 max-w-[85%] w-full ${message.user.email === session?.user?.email ? 'ml-auto' : 'mr-auto'}`}
                  >
                    <div className={`flex ${message.user.email === session?.user?.email ? 'flex-row-reverse' : 'flex-row'} items-end space-x-4 ${message.user.email === session?.user?.email ? 'space-x-reverse' : ''}`}>
                      <img
                        src={message.user.image || '/default-avatar.png'}
                        alt={message.user.name}
                        className="w-10 h-10 rounded-full border border-gray-200 flex-shrink-0"
                      />
                      <div className="min-w-0 max-w-full">
                        <div
                          className={`px-4 py-2 rounded-2xl ${
                            message.user.email === session?.user?.email
                              ? 'bg-blue-500 text-white rounded-br-none'
                              : 'bg-gray-200 text-gray-800 rounded-bl-none'
                          } break-words`}
                        >
                          <div className="font-bold text-sm mb-1">{message.user.name}</div>
                          <div className="whitespace-pre-wrap">{message.content}</div>
                          <div className="text-xs mt-1 opacity-70">
                            {new Date(message.timestamp).toLocaleTimeString()}
                          </div>
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
                  placeholder={translate('chat.typeMessage')}
                  className="flex-1 px-4 py-2 border border-gray-200 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  type="submit"
                  className="p-2 text-blue-600 hover:bg-blue-50 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                    className={`flex ${
                      message.user.email === session.user.email ? 'justify-end' : 'justify-start'
                    } mb-4 max-w-[85%] w-full ${message.user.email === session.user.email ? 'ml-auto' : 'mr-auto'}`}
                  >
                    <div className={`flex ${message.user.email === session.user.email ? 'flex-row-reverse' : 'flex-row'} items-end space-x-4 ${message.user.email === session.user.email ? 'space-x-reverse' : ''}`}>
                      <img
                        src={message.user.image || '/default-avatar.png'}
                        alt={message.user.name}
                        className="w-10 h-10 rounded-full border border-gray-200 flex-shrink-0"
                      />
                      <div className="min-w-0 max-w-full">
                        <div
                          className={`px-4 py-2 rounded-2xl ${
                            message.user.email === session.user.email
                              ? 'bg-purple-600 text-white rounded-br-none'
                              : message.user.email === 'ai@system'
                              ? 'bg-emerald-50 border border-emerald-200 text-gray-900 rounded-bl-none'
                              : message.user.email === 'system@system'
                              ? 'bg-red-50 border border-red-200 text-gray-900 rounded-bl-none'
                              : 'bg-gray-200 text-gray-800 rounded-bl-none'
                          } break-words`}
                        >
                          <div className="font-bold text-sm mb-1">{message.user.name}</div>
                          <div className="whitespace-pre-wrap">{message.content}</div>
                          <div className="text-xs mt-1 opacity-70">
                            {new Date(message.timestamp).toLocaleTimeString()}
                          </div>
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
        ) : activeTab === 'music' ? (
          <div className="flex-1 relative bg-gray-50">
            <div className="absolute inset-0">
              <MusicPlayer onLyricsChange={(lyrics) => {
                setCurrentLyrics(lyrics);
                if (lyrics?.lrc) {
                  const lyricsDiv = document.querySelector('.lyrics-container');
                  if (lyricsDiv) {
                    lyricsDiv.scrollTop = 0;
                  }
                }
              }} />
            </div>
          </div>
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