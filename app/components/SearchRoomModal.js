import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { searchChatRoom } from '@/lib/chatRoom';

export default function SearchRoomModal({ onClose, onJoin, showToast }) {
  const { data: session } = useSession();
  const [searchTerm, setSearchTerm] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState([]);

  // 处理直接加入聊天室
  const handleDirectJoin = async () => {
    if (!searchTerm.trim()) {
      showToast('请输入聊天室ID或邀请链接', 'error');
      return;
    }

    try {
      setIsSearching(true);
      let roomId = searchTerm.trim();

      // 检查是否是邀请链接
      if (roomId.includes('/invite/')) {
        const url = new URL(roomId);
        const pathParts = url.pathname.split('/');
        roomId = pathParts[pathParts.length - 1];
      }

      // 检查聊天室是否存在
      const result = await searchChatRoom(session, roomId);
      
      if (result?.error) {
        showToast(result.error, 'error');
        return;
      }

      if (!result) {
        showToast('聊天室不存在或无法访问', 'error');
        return;
      }

      // 调用加入聊天室函数
      await onJoin(roomId);
      onClose();
      showToast('已发送加入申请', 'success');
    } catch (error) {
      console.error('Error joining room:', error);
      showToast('加入聊天室失败，请重试', 'error');
    } finally {
      setIsSearching(false);
    }
  };

  // 处理搜索结果中的加入按钮点击
  const handleJoinFromResults = async (roomId) => {
    try {
      // 检查聊天室是否存在
      const result = await searchChatRoom(session, roomId);
      
      if (result?.error) {
        showToast(result.error, 'error');
        return;
      }

      if (!result) {
        showToast('聊天室不存在或无法访问', 'error');
        return;
      }

      // 调用加入聊天室函数
      await onJoin(roomId);
      onClose();
      showToast('已发送加入申请', 'success');
    } catch (error) {
      console.error('Error joining room:', error);
      showToast('加入聊天室失败，请重试', 'error');
    }
  };

  // 处理搜索
  const handleSearch = async () => {
    if (!searchTerm) return;
    
    setIsSearching(true);
    setSearchResults([]);
    try {
      // 调用 GitHub API 搜索用户
      const response = await fetch(
        `https://api.github.com/search/users?q=${searchTerm}+in:login`,
        {
          headers: {
            'Authorization': `Bearer ${session.accessToken}`,
            'Accept': 'application/vnd.github.v3+json'
          }
        }
      );

      if (!response.ok) {
        throw new Error('搜索失败');
      }

      const { items: users } = await response.json();
      const results = [];

      // 获取每个用户的聊天室列表
      for (const user of users.slice(0, 5)) { // 限制只处理前5个用户
        try {
          const result = await searchChatRoom(session, `${user.login}@${searchTerm}`);
          if (result && !result.error) {
            results.push(result);
          }
        } catch (error) {
          console.error('Error checking room:', error);
        }
      }

      setSearchResults(results);
      if (results.length === 0) {
        showToast('未找到匹配的聊天室', 'info');
      }
    } catch (error) {
      console.error('Error searching rooms:', error);
      showToast('搜索聊天室失败，请重试', 'error');
    } finally {
      setIsSearching(false);
    }
  };

  // 处理按下回车键
  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (searchTerm.includes('@') || searchTerm.includes('/invite/')) {
        handleDirectJoin();
      } else {
        handleSearch();
      }
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg w-full max-w-lg max-h-[80vh] overflow-hidden">
        <div className="flex justify-between items-center p-4 border-b dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">搜索/加入聊天室</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-4">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                搜索或加入聊天室
              </label>
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="输入用户名@聊天室ID或邀请链接"
                  className="flex-1 px-3 py-2 border dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
                />
                {searchTerm.includes('@') || searchTerm.includes('/invite/') ? (
                  <button
                    onClick={handleDirectJoin}
                    disabled={!searchTerm || isSearching}
                    className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 min-w-[80px] flex items-center justify-center"
                  >
                    {isSearching ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                    ) : (
                      '加入'
                    )}
                  </button>
                ) : (
                  <button
                    onClick={handleSearch}
                    disabled={!searchTerm || isSearching}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 min-w-[80px] flex items-center justify-center"
                  >
                    {isSearching ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                    ) : (
                      '搜索'
                    )}
                  </button>
                )}
              </div>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                提示：输入用户名@聊天室ID直接加入，或输入关键词搜索聊天室
              </p>
            </div>

            {searchResults.length > 0 && (
              <div className="mt-4">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">搜索结果</h3>
                <div className="space-y-2">
                  {searchResults.map((room) => (
                    <div
                      key={room.id}
                      className="p-3 border dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="text-base font-medium text-gray-900 dark:text-white">
                            {room.name}
                          </h4>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            {room.description || '暂无描述'}
                          </p>
                          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                            创建者：{room.owner.name} ({room.owner.login})
                          </p>
                        </div>
                        <button
                          onClick={() => handleJoinFromResults(room.id)}
                          className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                        >
                          加入
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
} 