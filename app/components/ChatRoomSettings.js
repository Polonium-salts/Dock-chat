'use client'

import { useState } from 'react'
import { useSession } from 'next-auth/react'
import JoinRequestsPanel from './JoinRequestsPanel'

export default function ChatRoomSettings({ 
  roomId, 
  onClose, 
  onDelete,
  showToast,
  isLoading,
  members = []
}) {
  const { data: session } = useSession();
  const [activeTab, setActiveTab] = useState('general');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [inviteLink, setInviteLink] = useState('');
  const [showCopiedMessage, setShowCopiedMessage] = useState(false);

  const isOwner = members.length > 0 && members[0] === session?.user?.login;

  const handleDelete = () => {
    if (showDeleteConfirm) {
      onDelete();
      setShowDeleteConfirm(false);
    } else {
      setShowDeleteConfirm(true);
    }
  };

  // 生成邀请链接
  const generateInviteLink = async () => {
    try {
      // 获取聊天室信息
      const response = await fetch(
        `https://api.github.com/repos/${session.user.login}/dock-chat-data/contents/chats/${roomId}/info.json`,
        {
          headers: {
            'Authorization': `Bearer ${session.accessToken}`,
            'Accept': 'application/vnd.github.v3+json'
          }
        }
      );

      if (!response.ok) {
        throw new Error('获取聊天室信息失败');
      }

      const data = await response.json();
      const roomInfo = JSON.parse(atob(data.content));

      // 生成邀请链接
      const inviteUrl = `${window.location.origin}/invite/${roomId}?name=${encodeURIComponent(roomInfo.name)}`;
      setInviteLink(inviteUrl);
    } catch (error) {
      console.error('Error generating invite link:', error);
      alert('生成邀请链接失败，请重试');
    }
  };

  // 复制邀请链接
  const copyInviteLink = async () => {
    try {
      await navigator.clipboard.writeText(inviteLink);
      setShowCopiedMessage(true);
      setTimeout(() => setShowCopiedMessage(false), 2000);
    } catch (error) {
      console.error('Error copying invite link:', error);
      alert('复制链接失败，请手动复制');
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-full max-w-lg max-h-[80vh] overflow-hidden">
        <div className="flex justify-between items-center p-4 border-b">
          <h2 className="text-xl font-semibold">聊天室设置</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="border-b">
          <div className="flex">
            <button
              className={`px-4 py-2 ${activeTab === 'general' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-500'}`}
              onClick={() => setActiveTab('general')}
            >
              常规设置
            </button>
            <button
              className={`px-4 py-2 ${activeTab === 'members' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-500'}`}
              onClick={() => setActiveTab('members')}
            >
              成员管理
            </button>
            {isOwner && (
              <button
                className={`px-4 py-2 ${activeTab === 'requests' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-500'}`}
                onClick={() => setActiveTab('requests')}
              >
                加入申请
              </button>
            )}
          </div>
        </div>

        <div className="overflow-y-auto" style={{ maxHeight: 'calc(80vh - 8rem)' }}>
          {activeTab === 'general' && (
            <div className="p-4">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    聊天室 ID
                  </label>
                  <div className="text-gray-600">{roomId}</div>
                </div>

                {isOwner && (
                  <div className="pt-4 border-t">
                    <h3 className="text-red-600 font-medium mb-2">危险操作</h3>
                    <button
                      onClick={handleDelete}
                      disabled={isLoading}
                      className="w-full px-4 py-2 text-white bg-red-600 hover:bg-red-700 rounded-md disabled:opacity-50"
                    >
                      {showDeleteConfirm ? '确认删除' : '删除聊天室'}
                    </button>
                    {showDeleteConfirm && (
                      <p className="mt-2 text-sm text-red-500">
                        删除后将无法恢复，请确认是否继续？
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'members' && (
            <div className="p-4">
              <h3 className="text-lg font-semibold mb-4">成员列表</h3>
              <div className="space-y-3">
                {members.map((member, index) => (
                  <div key={member} className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="ml-3">
                        <div className="text-sm font-medium text-gray-900">
                          {member}
                        </div>
                        {index === 0 && (
                          <div className="text-xs text-gray-500">管理员</div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'requests' && isOwner && (
            <JoinRequestsPanel roomId={roomId} showToast={showToast} />
          )}
        </div>
      </div>
    </div>
  )
} 