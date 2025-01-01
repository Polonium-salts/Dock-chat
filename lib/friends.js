import { loadChatHistory, saveChatHistory } from './github';

// 发送好友请求的逻辑
export const handleSendFriendRequest = async (session, friendId, note, setIsSending, showToast, setShowAddFriendModal) => {
  if (!session?.user?.login || !session.accessToken) {
    showToast('请先登录', 'error');
    return;
  }

  try {
    setIsSending(true);
    // 创建好友请求对象
    const requestId = `fr-${Date.now()}`;
    const requestData = {
      id: requestId,
      from: {
        id: session.user.id,
        login: session.user.login,
        name: session.user.name,
        image: session.user.image
      },
      to: friendId,
      note: note,
      status: 'pending',
      created_at: new Date().toISOString()
    };

    // 确保目标用户的仓库存在
    const targetRepoResponse = await fetch(
      `https://api.github.com/repos/${friendId}/dock-chat-data`,
      {
        headers: {
          'Authorization': `Bearer ${session.accessToken}`,
          'Accept': 'application/vnd.github.v3+json'
        }
      }
    );

    if (!targetRepoResponse.ok) {
      showToast('对方未初始化聊天数据，无法发送好友请求', 'error');
      return;
    }

    // 确保 friend_requests 目录存在
    try {
      await fetch(
        `https://api.github.com/repos/${friendId}/dock-chat-data/contents/friend_requests/.gitkeep`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${session.accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            message: 'Ensure friend_requests directory exists',
            content: 'MQ==', // Base64 encoded "1"
          })
        }
      );
    } catch (error) {
      console.log('Directory might already exist');
    }

    // 保存好友请求
    const encodedContent = btoa(unescape(encodeURIComponent(JSON.stringify(requestData, null, 2))));
    const response = await fetch(
      `https://api.github.com/repos/${friendId}/dock-chat-data/contents/friend_requests/${requestId}.json`,
      {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${session.accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message: `Friend request from ${session.user.login}`,
          content: encodedContent
        })
      }
    );

    if (!response.ok) {
      throw new Error('Failed to send friend request');
    }

    // 发送系统通知
    const notificationMessage = {
      content: `${session.user.name} (${session.user.login}) 向您发送了好友请求`,
      type: 'friend_request',
      user: {
        name: 'System',
        image: '/system-avatar.png',
        id: 'system'
      },
      createdAt: new Date().toISOString(),
      requestId: requestId
    };

    // 加载目标用户的系统消息
    const existingMessages = await loadChatHistory(session.accessToken, friendId, 'system');
    const updatedMessages = [...existingMessages, notificationMessage];
    
    // 保存更新后的系统消息
    await saveChatHistory(session.accessToken, friendId, 'system', updatedMessages);

    showToast('好友请求已发送', 'success');
    setShowAddFriendModal(false);
  } catch (error) {
    console.error('Error sending friend request:', error);
    showToast('发送好友请求失败，请重试', 'error');
  } finally {
    setIsSending(false);
  }
};

// 加载好友请求的逻辑
export const loadFriendRequests = async (session, setFriendRequests, showToast) => {
  if (!session?.user?.login || !session.accessToken) return;

  try {
    const response = await fetch(
      `https://api.github.com/repos/${session.user.login}/dock-chat-data/contents/friend_requests`,
      {
        headers: {
          'Authorization': `Bearer ${session.accessToken}`,
          'Accept': 'application/vnd.github.v3+json'
        }
      }
    );

    if (!response.ok) {
      if (response.status !== 404) {
        console.error('Error loading friend requests:', await response.text());
      }
      return;
    }

    const files = await response.json();
    const requests = await Promise.all(
      files
        .filter(file => file.name.endsWith('.json'))
        .map(async file => {
          try {
            const content = await fetch(file.download_url).then(res => res.json());
            return content.status === 'pending' ? content : null;
          } catch (error) {
            console.error('Error loading friend request:', error);
            return null;
          }
        })
    );

    const validRequests = requests.filter(Boolean);
    setFriendRequests(validRequests);

    // 更新未读好友请求数
    const unreadCount = validRequests.length;
    if (unreadCount > 0) {
      showToast(`您有 ${unreadCount} 个新的好友请求`, 'info');
    }
  } catch (error) {
    console.error('Error loading friend requests:', error);
  }
}; 