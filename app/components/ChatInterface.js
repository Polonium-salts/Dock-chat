'use client';

import { useState, useEffect } from 'react';
import { useSession, signOut } from 'next-auth/react';
import Parser from 'rss-parser';
import { AIChat } from '../services/aiChat';
import AIConfig from './AIConfig';
import MusicConfig from './MusicConfig';
import { useLanguage, useTranslation } from './LanguageProvider';
import MusicPlayer from './MusicPlayer';
import { RssService } from '../services/rssService';
import sanitizeHtml from 'sanitize-html';

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
  const [currentLyrics, setCurrentLyrics] = useState(null);
  const [isLoadingFeed, setIsLoadingFeed] = useState(false);
  const [rssError, setRssError] = useState(null);
  const [discoveredFeeds, setDiscoveredFeeds] = useState([]);
  const [isDiscovering, setIsDiscovering] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('articles');
  const [feedCategory, setFeedCategory] = useState('articles');
  const [selectedImage, setSelectedImage] = useState(null);

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

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    const userMessage = {
      id: Date.now(),
      content: newMessage,
      user: session.user,
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage]);
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
            image: '/ai-avatar.png', // Add a default AI avatar image
          },
          timestamp: new Date().toISOString(),
        };

        setMessages((prev) => [...prev, aiMessage]);
      } catch (error) {
        console.error('AI chat error:', error);
        // Show error message to user
        const errorMessage = {
          id: Date.now() + 1,
          content: `AI Error: ${error.message}`,
          user: {
            name: 'System',
            image: '/system-avatar.png', // Add a default system avatar image
            email: 'system@system',
          },
          timestamp: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, errorMessage]);
      } finally {
        setIsAiTyping(false);
      }
    }
  };

  const handleSaveAiConfig = (config) => {
    setAiConfig(config);
    localStorage.setItem('aiConfig', JSON.stringify(config));
    setActiveTab('ai');  // 修改这里：保存后跳转到 AI Chat 界面
  };

  // Load saved RSS feeds from localStorage
  useEffect(() => {
    const savedFeeds = localStorage.getItem('rssFeeds');
    if (savedFeeds) {
      setRssFeeds(JSON.parse(savedFeeds));
    }
  }, []);

  // Save RSS feeds to localStorage
  useEffect(() => {
    localStorage.setItem('rssFeeds', JSON.stringify(rssFeeds));
  }, [rssFeeds]);

  // 添加内容类型检测函数
  const detectContentTypes = (item) => {
    if (!item) return ['article']; // 默认返回文章类型
    
    const content = item.content || item['content:encoded'] || item.description || '';
    const title = item.title || '';
    const contentLower = (content || '').toLowerCase();
    const titleLower = (title || '').toLowerCase();

    const types = new Set();

    // 检测图片
    if (/<img[^>]+src=["'][^"']+["'][^>]*>/i.test(content)) {
      types.add('image');
    }

    // 检测视频
    if (
      /<video[^>]*>|<iframe[^>]*(youtube|vimeo|bilibili|youku)[^>]*>/i.test(content) ||
      /(youtube\.com|vimeo\.com|bilibili\.com|youku\.com)/i.test(contentLower) ||
      /\.(mp4|webm|ogg)(\?|$)/i.test(contentLower)
    ) {
      types.add('video');
    }

    // 检测音频
    if (
      /<audio[^>]*>|<iframe[^>]*(spotify|soundcloud)[^>]*>/i.test(content) ||
      /(spotify\.com|soundcloud\.com)/i.test(contentLower) ||
      /\.(mp3|wav|ogg)(\?|$)/i.test(contentLower) ||
      /podcast|音乐|music|song|track/i.test(titleLower)
    ) {
      types.add('audio');
    }

    // 检测社交媒体
    if (
      /(twitter\.com|facebook\.com|instagram\.com|weibo\.com|linkedin\.com)/i.test(contentLower) ||
      /@[\w\d]+/i.test(content) ||
      /#[\w\d]+/i.test(content)
    ) {
      types.add('social');
    }

    // 如果内容超过200字且没有其他类型，则归类为文章
    const textContent = (content || '').replace(/<[^>]+>/g, '').trim();
    if (textContent.length > 200 || types.size === 0) {
      types.add('article');
    }

    return Array.from(types);
  };

  // 修改提取图片URL的函数
  const extractImageUrls = (content) => {
    if (!content) return [];
    
    try {
      const urls = new Set();
      const imgRegex = /<img[^>]+src=["']([^"']+)["'][^>]*>/gi;
      let match;
      
      while ((match = imgRegex.exec(content)) !== null) {
        const src = match[1];
        if (src) {
          try {
            // 使用相对路径时添加基础URL
            const url = src.startsWith('http') ? src : `https://${src.replace(/^\/\//, '')}`;
            if (url.startsWith('http')) {
              urls.add(url);
            }
          } catch (e) {
            // 忽略无效的URL
            console.warn('Invalid image URL:', src);
          }
        }
      }

      return Array.from(urls);
    } catch (error) {
      console.error('Error extracting image URLs:', error);
      return [];
    }
  };

  // 修改RSS处理函数
  const processRssFeed = (feedData) => {
    try {
      const processedItems = (feedData.items || []).map(item => {
        try {
          const contentTypes = detectContentTypes(item);
          // 使用DOMParser安全解析HTML内容
          const parser = new DOMParser();
          const content = item.content || item['content:encoded'] || item.description || '';
          const doc = parser.parseFromString(content, 'text/html');
          
          // 清理潜在的危险标签和属性
          const sanitizedContent = sanitizeHtml(content, {
            allowedTags: [ 'p', 'b', 'i', 'em', 'strong', 'a', 'img', 'br', 'div', 'span' ],
            allowedAttributes: {
              'a': [ 'href' ],
              'img': [ 'src', 'alt' ]
            }
          });
          
          return {
            id: item.guid || item.link || Date.now().toString(),
            title: item.title || 'Untitled Item',
            link: item.link || '',
            date: item.pubDate || item.isoDate || new Date().toISOString(),
            content: sanitizedContent,
            contentSnippet: item.contentSnippet || item.description || '',
            imageUrls: extractImageUrls(content).filter(url => {
              try {
                new URL(url);
                return true;
              } catch {
                return false;
              }
            }),
            contentTypes: contentTypes,
          };
        } catch (itemError) {
          console.error('Error processing RSS item:', itemError);
          return null;
        }
      }).filter(Boolean); // 过滤掉处理失败的项

      // 统计各种类型的内容数量
      const typeCounts = processedItems.reduce((acc, item) => {
        item.contentTypes.forEach(type => {
          acc[type] = (acc[type] || 0) + 1;
        });
        return acc;
      }, {});

      return {
        items: processedItems,
        primaryType: Object.entries(typeCounts).sort(([,a], [,b]) => b - a)[0]?.[0] || 'article',
        typeCounts: typeCounts
      };
    } catch (error) {
      console.error('Error processing RSS feed:', error);
      return {
        items: [],
        primaryType: 'article',
        typeCounts: { article: 0 }
      };
    }
  };

  // 修改添加RSS源的函数
  const handleAddRssFeed = async (e) => {
    e.preventDefault();
    if (!rssUrl.trim() || isLoadingFeed) return;

    setIsLoadingFeed(true);
    setRssError(null);

    try {
      // 验证URL
      try {
        new URL(rssUrl);
      } catch {
        throw new Error(translate('rss.invalidUrl'));
      }

      // 添加超时控制
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 30000);

      try {
        // 调用发现服务
        const response = await fetch('/api/rss/discover', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ url: rssUrl }),
          signal: controller.signal
        });

        clearTimeout(timeout);

        if (!response.ok) {
          throw new Error(translate('rss.fetchError'));
        }

        const data = await response.json();
        
        // 处理发现服务返回的数据结构
        const feedData = data.feeds && data.feeds.length > 0 ? data.feeds[0] : data;
        
        // 检查是否已经存在相同的订阅
        const isExisting = rssFeeds.some(feed => feed.url === feedData.url);
        if (isExisting) {
          throw new Error(translate('rss.feedExists'));
        }

        // 获取完整的feed内容
        const feedResponse = await fetch('/api/rss/fetch', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ 
            url: feedData.url || rssUrl,
            timeout: 30000 // 30秒超时
          }),
          credentials: 'same-origin'
        });

        if (!feedResponse.ok) {
          throw new Error(translate('rss.fetchError'));
        }

        const fullFeedData = await feedResponse.json();
        
        // 确保feed数据有效
        if (!fullFeedData || !Array.isArray(fullFeedData.items)) {
          throw new Error(translate('rss.invalidFeed'));
        }

        // 处理RSS内容
        const processedFeed = processRssFeed(fullFeedData);
        
        if (processedFeed.items.length === 0) {
          throw new Error(translate('rss.noItems'));
        }

        const newFeed = {
          id: Date.now(),
          url: feedData.url || rssUrl,
          title: fullFeedData.title || feedData.title || translate('rss.untitledFeed'),
          description: fullFeedData.description || feedData.description || '',
          primaryType: processedFeed.primaryType,
          typeCounts: processedFeed.typeCounts,
          items: processedFeed.items,
          lastUpdated: new Date().toISOString()
        };

        setRssFeeds(prev => [...prev, newFeed]);
        setRssUrl('');
        setDiscoveredFeeds(data.feeds ? data.feeds.slice(1) : []);
        
        // 保存到本地存储
        const updatedFeeds = [...rssFeeds, newFeed];
        try {
          localStorage.setItem('rssFeeds', JSON.stringify(updatedFeeds));
        } catch (storageError) {
          console.error('Error saving to localStorage:', storageError);
        }
        
      } catch (error) {
        clearTimeout(timeout);
        throw error;
      }
      
    } catch (error) {
      console.error('Error adding RSS feed:', error);
      setRssError(error.message || translate('rss.fetchError'));
    } finally {
      setIsLoadingFeed(false);
    }
  };

  // 修改检测图片RSS源的函数
  const checkIfImageFeed = (feed) => {
    if (!feed || !feed.items || feed.items.length === 0) return false;

    // 检查前5个项目（或所有项目如果少于5个）
    const itemsToCheck = feed.items.slice(0, Math.min(5, feed.items.length));
    let imageCount = 0;
    let totalCount = 0;

    for (const item of itemsToCheck) {
      const content = item.content || item['content:encoded'] || item.description || '';
      
      // 跳过空内容
      if (!content.trim()) continue;
      
      totalCount++;
      
      // 检查内容中是否包含 <img> 标签
      const imgTags = content.match(/<img[^>]+src=["'][^"']+["'][^>]*>/ig);
      if (imgTags && imgTags.length > 0) {
        // 检查内容是否主要由图片组成
        const textContent = content
          .replace(/<img[^>]+>/g, '') // 移除所有img标签
          .replace(/<[^>]+>/g, '') // 移除其他HTML标签
          .trim();
        
        // 如果移除图片标签后的文本内容很少（少于100个字符），则认为这是一个图片项
        if (textContent.length < 100) {
          imageCount++;
        }
      }
    }

    // 如果没有有效内容，返回false
    if (totalCount === 0) return false;
    
    // 如果超过80%的内容都是以图片为主的，才认为是图片RSS
    return (imageCount / totalCount) >= 0.8;
  };

  const handleSelectDiscoveredFeed = async (feed) => {
    setIsLoadingFeed(true);
    setRssError(null);
    try {
      if (rssFeeds.some(f => f.url === feed.url)) {
        throw new Error(translate('rss.feedExists'));
      }

      // 通过后端代理获取 feed 内容
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

      // 检测是否为图片RSS源
      const isImageFeed = checkIfImageFeed(feedData);
      
      setRssFeeds(prev => [...prev, {
        id: Date.now(),
        title: feedData.title || feed.title || 'RSS Feed',
        description: feedData.description || '',
        url: feed.url,
        primaryType: isImageFeed ? 'image' : 'article',
        typeCounts: {
          image: isImageFeed ? 1 : 0,
          article: 1
        },
        items: (feedData.items || []).map(item => ({
          id: item.guid || item.link || Date.now().toString(),
          title: item.title || 'Untitled Item',
          link: item.link || '',
          date: item.pubDate || item.isoDate || new Date().toISOString(),
          content: item.content || item['content:encoded'] || item.description || '',
          contentSnippet: item.contentSnippet || item.description || '',
          imageUrls: extractImageUrls(item.content || item['content:encoded'] || item.description || ''),
          contentTypes: detectContentTypes(item),
        }))
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

  // 修改刷新feed的函数
  const handleRefreshFeed = async (feed) => {
    setIsLoadingFeed(true);
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 30000);

      try {
        const response = await fetch('/api/rss/fetch', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ 
            url: feed.url,
            timeout: 30000
          }),
          signal: controller.signal
        });

        clearTimeout(timeout);

        if (!response.ok) {
          throw new Error(translate('rss.refreshError'));
        }

        const updatedFeed = await response.json();
        const processedFeed = processRssFeed(updatedFeed);
        
        setRssFeeds(prev => prev.map(f => {
          if (f.id === feed.id) {
            return {
              ...f,
              title: updatedFeed.title || f.title,
              description: updatedFeed.description || f.description,
              items: processedFeed.items,
              primaryType: processedFeed.primaryType,
              typeCounts: processedFeed.typeCounts,
              lastUpdated: new Date().toISOString()
            };
          }
          return f;
        }));

      } catch (error) {
        clearTimeout(timeout);
        throw error;
      }
    } catch (error) {
      console.error('Error refreshing feed:', error);
      setRssError(error.message || translate('rss.refreshError'));
    } finally {
      setIsLoadingFeed(false);
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

  // 更新预览组件
  const FeedPreview = ({ feed, initialType }) => {
    const [activeType, setActiveType] = useState(initialType || feed.primaryType);
    const [showPreview, setShowPreview] = useState(false);
    const [previewContent, setPreviewContent] = useState(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [loadedImages, setLoadedImages] = useState(new Set());
    const imagesPerPage = 12;

    const handlePreview = (content, type) => {
      setPreviewContent({ ...content, type });
      setShowPreview(true);
    };

    const handleImageLoad = (imgUrl) => {
      setLoadedImages(prev => {
        const newSet = new Set(prev);
        newSet.add(imgUrl);
        return newSet;
      });
    };

    const renderPreviewContent = () => {
      if (!previewContent) return null;

      switch (previewContent.type) {
        case 'image':
          return (
            <div className="p-4 bg-white rounded-lg">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">{previewContent.title}</h3>
              <img
                src={previewContent.url}
                alt={previewContent.title}
                className="max-w-full max-h-[80vh] object-contain rounded-lg mx-auto"
              />
            </div>
          );
        case 'article':
          return (
            <div className="p-6 bg-white rounded-lg max-h-[90vh] overflow-y-auto">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">{previewContent.title}</h2>
              <div 
                className="prose prose-sm max-w-none"
                dangerouslySetInnerHTML={{ __html: previewContent.content }}
              />
            </div>
          );
        case 'video':
          return (
            <div className="bg-white rounded-lg overflow-hidden">
              <div className="aspect-video">
                {previewContent.url ? (
                  <iframe
                    src={previewContent.url}
                    className="w-full h-full"
                    allowFullScreen
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gray-900 text-white">
                    Video not available
                  </div>
                )}
              </div>
            </div>
          );
        default:
          return null;
      }
    };

    // 计算总图片数和总页数
    const calculateImageStats = () => {
      let totalImages = 0;
      const allImages = [];

      filteredItems.forEach(item => {
        if (item.imageUrls) {
          totalImages += item.imageUrls.length;
          allImages.push(...item.imageUrls.map(url => ({
            url,
            title: item.title,
            date: item.date
          })));
        }
      });

      return {
        totalImages,
        totalPages: Math.ceil(totalImages / imagesPerPage),
        allImages
      };
    };

    const typeLabels = {
      article: '文章',
      image: '图片',
      video: '视频',
      audio: '音频',
      social: '社交'
    };

    const filteredItems = feed.items.filter(item => 
      item.contentTypes.includes(activeType)
    );

    const { totalPages, allImages } = calculateImageStats();
    const currentImages = allImages.slice((currentPage - 1) * imagesPerPage, currentPage * imagesPerPage);

    // 处理页面切换
    const handlePageChange = (newPage) => {
      setCurrentPage(newPage);
      setLoadedImages(new Set());
      // 预加载下一页的图片
      if (newPage < totalPages) {
        const nextPageImages = allImages.slice(newPage * imagesPerPage, (newPage + 1) * imagesPerPage);
        nextPageImages.forEach(img => {
          const image = new Image();
          image.src = img.url;
        });
      }
    };

    return (
      <div className="w-full">
        {/* 内容类型切换器 */}
        <div className="flex flex-wrap gap-2 mb-4">
          {Object.entries(feed.typeCounts).map(([type, count]) => (
            <button
              key={type}
              onClick={() => {
                setActiveType(type);
                setCurrentPage(1);
                setLoadedImages(new Set());
              }}
              className={`px-3 py-1.5 text-sm rounded-lg transition-colors flex items-center space-x-1 ${
                activeType === type
                  ? 'bg-blue-100 text-blue-700 border border-blue-200'
                  : 'bg-gray-50 text-gray-600 hover:bg-gray-100 border border-transparent'
              }`}
            >
              <span>{typeLabels[type]}</span>
              <span className="px-1.5 py-0.5 text-xs rounded-full bg-white text-gray-600">
                {count}
              </span>
            </button>
          ))}
        </div>

        {/* 内容显示区域 */}
        <div className="bg-white rounded-lg shadow-sm p-4">
          {activeType === 'image' ? (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {currentImages.map((image, index) => (
                  <div
                    key={index}
                    className="relative aspect-square cursor-pointer group"
                    onClick={() => handlePreview({ url: image.url, title: image.title }, 'image')}
                  >
                    <div className="absolute inset-0 bg-gray-100 rounded-lg overflow-hidden">
                      {!loadedImages.has(image.url) && (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
                        </div>
                      )}
                      <img
                        src={image.url}
                        alt={image.title}
                        className={`w-full h-full object-cover transition-transform duration-200 group-hover:scale-105 ${
                          loadedImages.has(image.url) ? 'opacity-100' : 'opacity-0'
                        }`}
                        loading="lazy"
                        onLoad={() => handleImageLoad(image.url)}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                        <div className="absolute bottom-0 left-0 right-0 p-3">
                          <h4 className="text-sm font-medium text-white line-clamp-2">
                            {image.title}
                          </h4>
                          <p className="text-xs text-gray-300 mt-1">
                            {new Date(image.date).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* 分页控制 */}
              {totalPages > 1 && (
                <div className="mt-6 flex items-center justify-center gap-2">
                  <button
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className={`p-2 rounded-lg transition-colors ${
                      currentPage === 1
                        ? 'text-gray-400 cursor-not-allowed'
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>
                  <span className="text-sm text-gray-600">
                    {currentPage} / {totalPages}
                  </span>
                  <button
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className={`p-2 rounded-lg transition-colors ${
                      currentPage === totalPages
                        ? 'text-gray-400 cursor-not-allowed'
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </div>
              )}
            </>
          ) : (
            <div className="space-y-4">
              {filteredItems.map((item, index) => (
                <div
                  key={index}
                  className="p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
                  onClick={() => handlePreview({
                    title: item.title,
                    content: item.content,
                    url: activeType === 'video' ? item.videoUrl : null
                  }, activeType)}
                >
                  <h4 className="text-base font-medium text-gray-900">{item.title}</h4>
                  {item.contentSnippet && (
                    <p className="mt-2 text-sm text-gray-600 line-clamp-2">{item.contentSnippet}</p>
                  )}
                  <div className="mt-2 flex items-center gap-2">
                    <span className="text-xs text-gray-400">
                      {new Date(item.date).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 内容预览模态框 */}
        {showPreview && (
          <div 
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm"
            onClick={() => setShowPreview(false)}
          >
            <div 
              className="relative max-w-4xl w-full mx-4"
              onClick={e => e.stopPropagation()}
            >
              {renderPreviewContent()}
              <button
                className="absolute top-4 right-4 text-white hover:text-gray-300 transition-colors"
                onClick={() => setShowPreview(false)}
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        )}
      </div>
    );
  };

  const ImageViewer = ({ imageUrl, onClose }) => {
    if (!imageUrl) return null;

    return (
      <div 
        className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-90"
        onClick={onClose}
      >
        <div className="relative max-w-4xl max-h-[90vh] mx-4">
          <img
            src={imageUrl}
            alt=""
            className="max-w-full max-h-[90vh] object-contain rounded-lg"
          />
          <button
            className="absolute top-4 right-4 text-white hover:text-gray-300 transition-colors"
            onClick={onClose}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
    );
  };

  const RssSidebar = ({ feeds, selectedCategory, onCategoryChange, onRefresh, onRemove }) => {
    const typeLabels = {
      article: '文章',
      image: '图片',
      video: '视频',
      audio: '音频',
      social: '社交'
    };

    return (
      <div className="h-full flex flex-col">
        {/* RSS 订阅输入框 */}
        <div className="p-4 border-b border-gray-200">
          <form onSubmit={handleAddRssFeed} className="space-y-2">
            <div className="flex items-center gap-2">
              <input
                type="url"
                value={rssUrl}
                onChange={(e) => setRssUrl(e.target.value)}
                placeholder={translate('rss.enterUrl')}
                className="flex-1 px-3 py-2 text-sm bg-white border border-gray-200 rounded-lg placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={isLoadingFeed}
              />
              <button
                type="submit"
                disabled={isLoadingFeed || !rssUrl.trim()}
                className={`p-2 rounded-lg transition-colors ${
                  isLoadingFeed 
                    ? 'bg-blue-100 cursor-not-allowed' 
                    : !rssUrl.trim()
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-700 text-white'
                }`}
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
        </div>

        {/* 类别切换按钮 */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex flex-wrap gap-2">
            {Object.keys(typeLabels).map(type => (
              <button
                key={type}
                onClick={() => onCategoryChange(type)}
                className={`p-2 rounded-lg transition-colors ${
                  selectedCategory === type
                    ? 'bg-blue-100 text-blue-800'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
                title={typeLabels[type]}
              >
                {type === 'article' && (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9.5a2.5 2.5 0 00-2.5-2.5H14" />
                  </svg>
                )}
                {type === 'image' && (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                )}
                {type === 'video' && (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                )}
                {type === 'audio' && (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2z" />
                  </svg>
                )}
                {type === 'social' && (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z" />
                  </svg>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* RSS 订阅列表 */}
        <div className="flex-1 overflow-y-auto">
          <div className="space-y-2 p-4">
            {feeds.length === 0 ? (
              <div className="text-center text-gray-500 py-8">
                <svg className="w-12 h-12 mx-auto mb-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 5c7.18 0 13 5.82 13 13M6 11a7 7 0 017 7m-6 0a1 1 0 11-2 0 1 1 0 012 0z" />
                </svg>
                <p className="text-sm">{translate('rss.noFeeds')}</p>
                <p className="text-xs mt-1 text-gray-400">{translate('rss.addFeedDescription')}</p>
              </div>
            ) : (
              feeds.map((feed, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 bg-white rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="flex-1 min-w-0 mr-4">
                    <h3 className="text-sm font-medium text-gray-900 truncate">
                      {feed.title}
                    </h3>
                    <p className="text-xs text-gray-500 truncate mt-1">
                      {feed.url}
                    </p>
                    <div className="flex gap-1 mt-1">
                      {Object.entries(feed.typeCounts).map(([type, count]) => (
                        <span
                          key={type}
                          className={`px-1.5 py-0.5 text-xs rounded-full ${
                            type === selectedCategory
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-gray-100 text-gray-600'
                          }`}
                        >
                          {typeLabels[type]} ({count})
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => onRefresh(feed)}
                      className="p-1.5 text-gray-400 hover:text-blue-600 rounded-full transition-colors"
                      title="刷新"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                    </button>
                    <button
                      onClick={() => onRemove(feed)}
                      className="p-1.5 text-gray-400 hover:text-red-600 rounded-full transition-colors"
                      title="删除"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    );
  };

  const handleDeleteChat = (chatId) => {
    if (window.confirm(translate('ai.confirmDelete'))) {
      setAiChats(prev => prev.filter(chat => chat.id !== chatId));
      if (currentChatId === chatId) {
        setCurrentChatId(null);
        setAiMessages([]);
      }
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
              onClick={() => setActiveTab('music')}
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
                            <div className="flex justify-between items-center">
                              <div>
                                <div className="text-sm font-medium truncate">{chat.title}</div>
                                <div className="text-xs text-gray-600 mt-1">
                                  {new Date(chat.timestamp).toLocaleDateString()}
                                </div>
                              </div>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteChat(chat.id);
                                }}
                                className="p-1 text-gray-400 hover:text-red-600 rounded-full transition-colors"
                                title={translate('ai.deleteChat')}
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </button>
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
                <div className="flex-1 flex overflow-hidden">
                  {/* 左侧边栏 */}
                  <aside className="w-72 flex-shrink-0 border-r border-gray-200 bg-gray-50">
                    <RssSidebar
                      feeds={rssFeeds}
                      selectedCategory={selectedCategory}
                      onCategoryChange={setSelectedCategory}
                      onRefresh={handleRefreshFeed}
                      onRemove={(feed) => handleRemoveFeed(feed.id)}
                    />
                  </aside>

                  {/* 主内容区域 */}
                  <main className="flex-1 min-w-0 overflow-y-auto">
                    <div className="max-w-4xl w-full mx-auto p-6">
                      <div className="space-y-6">
                        {rssFeeds
                          .filter(feed => feed.items.some(item => item.contentTypes.includes(selectedCategory)))
                          .map((feed, index) => (
                            <div key={index} className="bg-white rounded-lg shadow-sm p-6">
                              <FeedPreview feed={feed} initialType={selectedCategory} />
                            </div>
                          ))}
                      </div>
                    </div>
                  </main>
                </div>
              ) : null}
            </>
          )}
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 bg-gray-50">
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
        ) : activeTab === 'music' ? (
          <div className="flex-1 relative bg-gray-50">
            <div className="absolute inset-0">
              <MusicPlayer onLyricsChange={(lyrics) => {
                setCurrentLyrics(lyrics);
                // 确保歌词更新时立即反映在左侧边栏
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
                  {rssFeeds
                    .filter(feed => {
                      // 如果 feed 中有任何项目包含所选类型，就显示这个 feed
                      return feed.items.some(item => item.contentTypes.includes(selectedCategory));
                    })
                    .map((feed, index) => (
                    <div key={index} className="bg-white rounded-lg shadow-sm p-6">
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center space-x-4">
                            <h3 className="text-lg font-semibold text-gray-900">{feed.title}</h3>
                            <div className="flex gap-1">
                              {Object.entries(feed.typeCounts).map(([type, count]) => (
                                <span
                                  key={type}
                                  className={`px-2 py-0.5 text-xs rounded-full ${
                                    type === selectedCategory
                                      ? 'bg-blue-100 text-blue-800'
                                      : 'bg-gray-100 text-gray-600'
                                  }`}
                                >
                                  {count}
                                </span>
                        ))}
                      </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => handleRefreshFeed(feed)}
                              className="p-2 text-gray-400 hover:text-blue-600 rounded-full transition-colors"
                              title={translate('rss.refresh')}
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                              </svg>
                            </button>
                            <button
                              onClick={() => handleRemoveFeed(feed.id)}
                              className="p-2 text-gray-400 hover:text-red-600 rounded-full transition-colors"
                              title={translate('rss.remove')}
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </div>
                        </div>
                        <FeedPreview feed={feed} initialType={selectedCategory} />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Image Viewer */}
      {selectedImage && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-90"
          onClick={() => setSelectedImage(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh] mx-4">
            <img
              src={selectedImage}
              alt=""
              className="max-w-full max-h-[90vh] object-contain rounded-lg"
            />
            <button
              className="absolute top-4 right-4 text-white hover:text-gray-300 transition-colors"
              onClick={() => setSelectedImage(null)}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </div>
  );
} 