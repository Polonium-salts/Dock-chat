import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { searchChatRoom } from '@/lib/chatRoom';

export default function JoinRoomModal({ onClose, onJoin, showToast }) {
  const { data: session } = useSession();
  const [roomId, setRoomId] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResult, setSearchResult] = useState(null);
  const [isJoining, setIsJoining] = useState(false);

  const handleSearch = async () => {
    if (!roomId) return;
    
    setIsSearching(true);
    try {
      const result = await searchChatRoom(session, roomId);
      if (result.error) {
        showToast(result.error, 'error');
        setSearchResult(null);
      } else {
        setSearchResult(result);
      }
    } catch (error) {
      console.error('Error searching room:', error);
      showToast('搜索聊天室失败，请重试', 'error');
    } finally {
      setIsSearching(false);
    }
  };

  const handleJoin = async () => {
    if (!searchResult) return;
    
    setIsJoining(true);
    try {
      await onJoin(roomId);
    } finally {
      setIsJoining(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-full max-w-lg">
        <div className="flex justify-between items-center p-4 border-b">
          <h2 className="text-xl font-semibold">加入聊天室</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-4">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                聊天室 ID
              </label>
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={roomId}
                  onChange={(e) => setRoomId(e.target.value)}
                  placeholder="请输入 用户名@域名"
                  className="flex-1 px-3 py-2 border rounded-md"
                />
                <button
                  onClick={handleSearch}
                  disabled={!roomId || isSearching}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  {isSearching ? '搜索中...' : '搜索'}
                </button>
              </div>
              <p className="mt-1 text-sm text-gray-500">
                例如：johndoe@github.com
              </p>
            </div>

            {searchResult && (
              <div className="border rounded-lg p-4 space-y-3">
                <div className="flex items-center space-x-3">
                  <img
                    src={searchResult.owner.avatar_url}
                    alt={searchResult.owner.name}
                    className="w-12 h-12 rounded-full"
                  />
                  <div>
                    <h3 className="font-semibold">{searchResult.name}</h3>
                    <p className="text-sm text-gray-500">
                      创建者：{searchResult.owner.name} (@{searchResult.owner.login})
                    </p>
                  </div>
                </div>

                {searchResult.description && (
                  <p className="text-sm text-gray-600">{searchResult.description}</p>
                )}

                <div className="text-sm text-gray-500">
                  成员数：{searchResult.members.length}
                </div>

                <button
                  onClick={handleJoin}
                  disabled={isJoining}
                  className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  {isJoining ? '加入中...' : '加入聊天室'}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
} 