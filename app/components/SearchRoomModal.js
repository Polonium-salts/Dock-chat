import { useState } from 'react';
import { useSession } from 'next-auth/react';

export default function SearchRoomModal({ onClose, onJoin, showToast }) {
  const { data: session } = useSession();
  const [searchTerm, setSearchTerm] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [searchMode, setSearchMode] = useState('search'); // 'search' 或 'id'

  // 处理搜索
  const handleSearch = async () => {
    if (!searchTerm) return;
    
    setIsSearching(true);
    try {
      if (searchMode === 'id') {
        // 直接通过 ID 加入
        onJoin({ preventDefault: () => {} }, searchTerm);
        onClose();
        return;
      }

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
          // 检查用户是否有数据仓库
          const repoResponse = await fetch(
            `https://api.github.com/repos/${user.login}/dock-chat-data`,
            {
              headers: {
                'Authorization': `Bearer ${session.accessToken}`,
                'Accept': 'application/vnd.github.v3+json'
              }
            }
          );

          if (!repoResponse.ok) continue;

          // 获取聊天室列表
          const roomsResponse = await fetch(
            `https://api.github.com/repos/${user.login}/dock-chat-data/contents/rooms`,
            {
              headers: {
                'Authorization': `Bearer ${session.accessToken}`,
                'Accept': 'application/vnd.github.v3+json'
              }
            }
          );

          if (!roomsResponse.ok) continue;

          const rooms = await roomsResponse.json();
          
          // 获取每个聊天室的配置
          for (const room of rooms) {
            try {
              const configResponse = await fetch(
                `${room.url}/config.json`,
                {
                  headers: {
                    'Authorization': `Bearer ${session.accessToken}`,
                    'Accept': 'application/vnd.github.v3+json'
                  }
                }
              );

              if (!configResponse.ok) continue;

              const configData = await configResponse.json();
              const config = JSON.parse(atob(configData.content));
              
              // 检查聊天室名称或描述是否匹配搜索词
              if (config.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                  config.description?.toLowerCase().includes(searchTerm.toLowerCase())) {
                results.push({
                  id: `${user.login}@${room.name}`,
                  name: config.name || `${user.login}的聊天室`,
                  owner: {
                    login: user.login,
                    name: user.name || user.login,
                    avatar_url: user.avatar_url
                  },
                  domain: room.name,
                  members: config.members || [],
                  created_at: config.created_at,
                  description: config.description || '',
                  type: config.type || 'public'
                });
              }
            } catch (error) {
              console.error('Error loading room config:', error);
            }
          }
        } catch (error) {
          console.error('Error loading user rooms:', error);
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
      handleSearch();
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg w-full max-w-lg max-h-[80vh] overflow-hidden">
        <div className="flex justify-between items-center p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">搜索/加入聊天室</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-4">
          <div className="space-y-4">
            {/* 搜索模式切换 */}
            <div className="flex space-x-2 mb-4">
              <button
                onClick={() => setSearchMode('search')}
                className={`flex-1 py-2 px-4 rounded-md ${
                  searchMode === 'search'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                }`}
              >
                搜索聊天室
              </button>
              <button
                onClick={() => setSearchMode('id')}
                className={`flex-1 py-2 px-4 rounded-md ${
                  searchMode === 'id'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                }`}
              >
                通过ID加入
              </button>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {searchMode === 'search' ? '搜索聊天室' : '输入聊天室ID'}
              </label>
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder={searchMode === 'search' ? '输入关键词搜索聊天室' : '输入聊天室ID'}
                  className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
                />
                <button
                  onClick={handleSearch}
                  disabled={!searchTerm || isSearching}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  {isSearching ? '处理中...' : (searchMode === 'search' ? '搜索' : '加入')}
                </button>
              </div>
            </div>

            {searchMode === 'search' && searchResults.length > 0 && (
              <div className="border border-gray-200 dark:border-gray-700 rounded-lg divide-y divide-gray-200 dark:divide-gray-700 max-h-[40vh] overflow-y-auto">
                {searchResults.map(room => (
                  <div
                    key={room.id}
                    className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer"
                    onClick={() => onJoin({ preventDefault: () => {} }, room.id)}
                  >
                    <div className="flex items-center space-x-3">
                      <img
                        src={room.owner.avatar_url}
                        alt={room.owner.name}
                        className="w-10 h-10 rounded-full"
                      />
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900 dark:text-white">{room.name}</h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          创建者：{room.owner.name} (@{room.owner.login})
                        </p>
                        {room.description && (
                          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{room.description}</p>
                        )}
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                          ID: {room.id}
                        </p>
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        {room.members.length} 成员
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
} 