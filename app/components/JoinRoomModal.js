import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { searchChatRoom, searchChatRooms } from '@/lib/chatRoom';

export default function JoinRoomModal({ onClose, onJoin, showToast }) {
  const { data: session } = useSession();
  const [searchTerm, setSearchTerm] = useState('');
  const [roomId, setRoomId] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [isJoining, setIsJoining] = useState(false);

  const handleSearch = async () => {
    if (!searchTerm) return;
    
    setIsSearching(true);
    try {
      const results = await searchChatRooms(session, searchTerm);
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

  const handleSelectRoom = async (room) => {
    setRoomId(room.id);
    setSelectedRoom(room);
  };

  const handleJoin = async () => {
    if (!selectedRoom) return;
    
    setIsJoining(true);
    try {
      await onJoin(selectedRoom.id);
    } finally {
      setIsJoining(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-full max-w-lg max-h-[80vh] overflow-hidden">
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
                搜索聊天室
              </label>
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="输入关键词搜索"
                  className="flex-1 px-3 py-2 border rounded-md"
                />
                <button
                  onClick={handleSearch}
                  disabled={!searchTerm || isSearching}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  {isSearching ? '搜索中...' : '搜索'}
                </button>
              </div>
              <p className="mt-1 text-sm text-gray-500">
                或者直接输入聊天室ID：用户名@域名
              </p>
            </div>

            {searchResults.length > 0 && (
              <div className="border rounded-lg divide-y max-h-[40vh] overflow-y-auto">
                {searchResults.map(room => (
                  <div
                    key={room.id}
                    className={`p-4 hover:bg-gray-50 cursor-pointer ${selectedRoom?.id === room.id ? 'bg-blue-50' : ''}`}
                    onClick={() => handleSelectRoom(room)}
                  >
                    <div className="flex items-center space-x-3">
                      <img
                        src={room.owner.avatar_url}
                        alt={room.owner.name}
                        className="w-10 h-10 rounded-full"
                      />
                      <div className="flex-1">
                        <h3 className="font-semibold">{room.name}</h3>
                        <p className="text-sm text-gray-500">
                          创建者：{room.owner.name} (@{room.owner.login})
                        </p>
                        {room.description && (
                          <p className="text-sm text-gray-600 mt-1">{room.description}</p>
                        )}
                      </div>
                      <div className="text-sm text-gray-500">
                        {room.members.length} 成员
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {selectedRoom && (
              <div className="mt-4">
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