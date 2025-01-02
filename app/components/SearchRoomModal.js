import { useState } from 'react';
import { useSession } from 'next-auth/react';

export default function SearchRoomModal({ onClose, onJoin, showToast }) {
  const { data: session } = useSession();
  const [searchTerm, setSearchTerm] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [inviteLink, setInviteLink] = useState('');

  // 处理直接加入聊天室
  const handleDirectJoin = async () => {
    if (!searchTerm.trim()) {
      showToast('请输入聊天室ID或邀请链接', 'error');
      return;
    }

    try {
      setIsSearching(true);
      let roomId = searchTerm.trim();
      let owner;

      // 检查是否是邀请链接
      if (roomId.includes('/invite/')) {
        const url = new URL(roomId);
        const pathParts = url.pathname.split('/');
        roomId = pathParts[pathParts.length - 1];
      }

      // 从roomId中提取owner
      [owner] = roomId.split('-');
      
      if (!owner) {
        showToast('无效的聊天室ID或邀请链接', 'error');
        return;
      }

      // 检查聊天室是否存在
      const response = await fetch(
        `https://api.github.com/repos/${owner}/dock-chat-data/contents/chats/${roomId}/info.json`,
        {
          headers: {
            'Authorization': `Bearer ${session.accessToken}`,
            'Accept': 'application/vnd.github.v3+json'
          }
        }
      );

      if (!response.ok) {
        if (response.status === 404) {
          showToast('聊天室不存在', 'error');
        } else {
          throw new Error('检查聊天室失败');
        }
        return;
      }

      // 获取聊天室信息
      const data = await response.json();
      const roomInfo = JSON.parse(atob(data.content));

      // 检查是否已经是成员
      if (roomInfo.members?.some(member => member.login === session.user.login)) {
        showToast('您已经是该聊天室的成员', 'info');
        onClose();
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

  // 处理按下回车键
  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleDirectJoin();
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg w-full max-w-lg max-h-[80vh] overflow-hidden">
        <div className="flex justify-between items-center p-4 border-b dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">加入聊天室</h2>
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
                输入聊天室ID或邀请链接
              </label>
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="输入聊天室ID或粘贴邀请链接"
                  className="flex-1 px-3 py-2 border dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
                />
                <button
                  onClick={handleDirectJoin}
                  disabled={!searchTerm || isSearching}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 min-w-[80px] flex items-center justify-center"
                >
                  {isSearching ? (
                    <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                  ) : (
                    '加入'
                  )}
                </button>
              </div>
              <div className="mt-2 space-y-1">
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  • 聊天室ID格式：用户名-聊天室名称
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  • 或直接粘贴邀请链接
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 