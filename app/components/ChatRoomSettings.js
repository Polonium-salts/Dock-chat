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
  const [isGeneratingLink, setIsGeneratingLink] = useState(false);

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
      setIsGeneratingLink(true);
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
        if (response.status === 404) {
          throw new Error('聊天室信息不存在');
        }
        throw new Error('获取聊天室信息失败');
      }

      const data = await response.json();
      const roomInfo = JSON.parse(atob(data.content));

      // 生成邀请链接
      const inviteUrl = `${window.location.origin}/invite/${roomId}?name=${encodeURIComponent(roomInfo.name || '聊天室')}`;
      console.log('Generated invite URL:', inviteUrl); // 添加调试日志
      setInviteLink(inviteUrl);
      showToast('邀请链接已生成', 'success');
    } catch (error) {
      console.error('Error generating invite link:', error);
      showToast(error.message || '生成邀请链接失败，请重试', 'error');
    } finally {
      setIsGeneratingLink(false);
    }
  };

  // 复制邀请链接
  const copyInviteLink = async () => {
    if (!inviteLink) {
      showToast('请先生成邀请链接', 'error');
      return;
    }

    try {
      await navigator.clipboard.writeText(inviteLink);
      showToast('邀请链接已复制到剪贴板', 'success');
    } catch (error) {
      console.error('Error copying invite link:', error);
      showToast('复制链接失败，请手动复制', 'error');
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg w-full max-w-lg max-h-[80vh] overflow-hidden">
        <div className="flex justify-between items-center p-4 border-b dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">聊天室设置</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="border-b dark:border-gray-700">
          <div className="flex">
            <button
              className={`px-4 py-2 ${activeTab === 'general' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-500 dark:text-gray-400'}`}
              onClick={() => setActiveTab('general')}
            >
              常规设置
            </button>
            <button
              className={`px-4 py-2 ${activeTab === 'members' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-500 dark:text-gray-400'}`}
              onClick={() => setActiveTab('members')}
            >
              成员管理
            </button>
            {isOwner && (
              <button
                className={`px-4 py-2 ${activeTab === 'requests' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-500 dark:text-gray-400'}`}
                onClick={() => setActiveTab('requests')}
              >
                加入申请
              </button>
            )}
          </div>
        </div>

        <div className="overflow-y-auto" style={{ maxHeight: 'calc(80vh - 8rem)' }}>
          {activeTab === 'general' && (
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  聊天室 ID
                </label>
                <div className="text-gray-600 dark:text-gray-400">{roomId}</div>
              </div>

              {/* 邀请链接部分 */}
              <div className="pt-4 border-t dark:border-gray-700">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">邀请链接</h3>
                <div className="space-y-2">
                  <div className="flex space-x-2">
                    <input
                      type="text"
                      value={inviteLink}
                      readOnly
                      placeholder="点击生成邀请链接"
                      className="flex-1 px-3 py-2 border dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
                    />
                    {!inviteLink ? (
                      <button
                        onClick={generateInviteLink}
                        disabled={isGeneratingLink}
                        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 min-w-[80px]"
                      >
                        {isGeneratingLink ? (
                          <div className="flex items-center justify-center">
                            <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                          </div>
                        ) : (
                          '生成'
                        )}
                      </button>
                    ) : (
                      <button
                        onClick={copyInviteLink}
                        className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 min-w-[80px]"
                      >
                        复制
                      </button>
                    )}
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    生成邀请链接，分享给好友即可邀请加入聊天室
                  </p>
                </div>
              </div>

              {isOwner && (
                <div className="pt-4 border-t dark:border-gray-700">
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
          )}

          {activeTab === 'members' && (
            <div className="p-4">
              <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">成员列表</h3>
              <div className="space-y-3">
                {members.map((member, index) => (
                  <div key={member} className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="ml-3">
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          {member}
                        </div>
                        {index === 0 && (
                          <div className="text-xs text-gray-500 dark:text-gray-400">管理员</div>
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