import { saveChatHistory, loadChatHistory } from './github';
import { updateChatMessagesCache } from './cache';

// 发送消息的逻辑
export const sendMessage = async (
  e,
  session,
  newMessage,
  setNewMessage,
  socket,
  activeChat,
  messages,
  setMessages,
  contacts,
  setContacts,
  userConfig,
  setUserConfig,
  updateConfig,
  setIsSending,
  showToast
) => {
  e.preventDefault();
  if (!newMessage.trim() || !session || setIsSending) return;

  try {
    setIsSending(true);
    const messageId = `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const message = {
      id: messageId,
      content: newMessage.trim(),
      user: {
        name: session.user.name,
        image: session.user.image,
        id: session.user.id,
        login: session.user.login
      },
      room: activeChat,
      createdAt: new Date().toISOString(),
      type: 'message'
    };

    // 先更新本地消息状态
    setMessages(prev => [...prev, {
      ...message,
      isOwnMessage: true
    }]);
    setNewMessage('');

    // 发送消息到 Socket.IO
    if (socket?.connected) {
      socket.emit('message', message);
    }

    // 保存消息到仓库
    try {
      const updatedMessages = [...messages, message];
      await saveChatHistory(session.accessToken, session.user.login, activeChat, updatedMessages);

      // 更新联系人列表中的最后一条消息
      const updatedContacts = contacts.map(contact => {
        if (contact.id === activeChat) {
          return {
            ...contact,
            lastMessage: message.content,
            updated_at: new Date().toISOString()
          };
        }
        return contact;
      });
      setContacts(updatedContacts);

      // 更新用户配置
      if (userConfig) {
        const updatedConfig = {
          ...userConfig,
          contacts: updatedContacts,
          last_updated: new Date().toISOString()
        };
        await updateConfig(session.accessToken, session.user.login, updatedConfig);
        setUserConfig(updatedConfig);
      }
    } catch (error) {
      console.error('Error saving message:', error);
      showToast('消息已发送但保存失败', 'warning');
    }
  } catch (error) {
    console.error('Failed to send message:', error);
    showToast('发送消息失败', 'error');
    setNewMessage(newMessage); // 恢复消息内容
  } finally {
    setIsSending(false);
  }
};

// 加载聊天消息的逻辑
export const loadChatMessages = async (
  session,
  activeChat,
  setIsLoading,
  setMessages,
  getChatMessagesCache,
  updateChatMessagesCache,
  showToast
) => {
  if (!session?.user?.login || !session.accessToken || !activeChat) return;

  try {
    setIsLoading(true);
    setMessages([]); // 立即清空消息，避免显示上一个聊天室的消息

    // 尝试从缓存加载消息
    const cachedMessages = getChatMessagesCache(session.user.login, activeChat);
    if (cachedMessages) {
      console.log('Using cached messages for', activeChat);
      const formattedCachedMessages = cachedMessages.map(msg => ({
        ...msg,
        isOwnMessage: msg.user?.id === session.user.id
      }));
      setMessages(formattedCachedMessages);
      setIsLoading(false);
      return;
    }

    console.log('Loading messages for chat:', activeChat);
    const messages = await loadChatHistory(session.accessToken, session.user.login, activeChat);
    
    if (Array.isArray(messages)) {
      const formattedMessages = messages.map(msg => ({
        id: msg.id || `msg-${msg.createdAt}-${msg.user?.id}`,
        content: msg.content || '',
        user: {
          name: msg.user?.name || 'Unknown User',
          image: msg.user?.image || '/default-avatar.png',
          id: msg.user?.id || 'unknown',
          login: msg.user?.login
        },
        createdAt: msg.createdAt || new Date().toISOString(),
        type: msg.type || 'message',
        isOwnMessage: msg.user?.id === session.user.id
      }));

      // 按时间排序
      const sortedMessages = formattedMessages.sort(
        (a, b) => new Date(a.createdAt) - new Date(b.createdAt)
      );

      setMessages(sortedMessages);
      updateChatMessagesCache(session.user.login, activeChat, sortedMessages);
    }
  } catch (error) {
    console.error('Error loading messages:', error);
    showToast('加载消息失败', 'error');
    setMessages([]);
  } finally {
    setIsLoading(false);
  }
}; 