'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import FriendGroups from '../components/FriendGroups'
import EditFriendModal from '../components/EditFriendModal'
import AddFriendModal from '../components/AddFriendModal'
import FriendRecommendations from '../components/FriendRecommendations'
import FriendActivity from '../components/FriendActivity'
import { UserPlusIcon, UserGroupIcon, ChartBarIcon } from '@heroicons/react/24/outline'

export default function FriendsPage() {
  const { data: session } = useSession()
  const [friends, setFriends] = useState([])
  const [groups, setGroups] = useState([])
  const [showAddFriend, setShowAddFriend] = useState(false)
  const [showEditFriend, setShowEditFriend] = useState(false)
  const [selectedFriend, setSelectedFriend] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [currentView, setCurrentView] = useState('list') // 'list', 'recommendations', 'activity'

  // 加载好友和分组数据
  useEffect(() => {
    const loadFriendsData = async () => {
      if (!session?.user?.login || !session.accessToken) return

      try {
        setIsLoading(true)
        
        // 加载好友数据
        const friendsResponse = await fetch(
          `https://api.github.com/repos/${session.user.login}/dock-chat-data/contents/friends.json`,
          {
            headers: {
              'Authorization': `Bearer ${session.accessToken}`,
              'Accept': 'application/vnd.github.v3+json'
            }
          }
        )

        if (friendsResponse.ok) {
          const data = await friendsResponse.json()
          const content = JSON.parse(atob(data.content))
          setFriends(content.friends || [])
          setGroups(content.groups || [])
        }
      } catch (error) {
        console.error('Error loading friends data:', error)
      } finally {
        setIsLoading(false)
      }
    }

    loadFriendsData()
  }, [session])

  // 保存好友数据
  const saveFriendsData = async (updatedFriends, updatedGroups) => {
    if (!session?.user?.login || !session.accessToken) return

    try {
      const content = JSON.stringify({
        friends: updatedFriends,
        groups: updatedGroups
      }, null, 2)

      const encodedContent = btoa(unescape(encodeURIComponent(content)))

      await fetch(
        `https://api.github.com/repos/${session.user.login}/dock-chat-data/contents/friends.json`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${session.accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            message: 'Update friends data',
            content: encodedContent,
            sha: '' // 需要获取文件的 SHA
          })
        }
      )
    } catch (error) {
      console.error('Error saving friends data:', error)
    }
  }

  // 创建分组
  const handleCreateGroup = async (newGroup) => {
    const updatedGroups = [...groups, newGroup]
    setGroups(updatedGroups)
    await saveFriendsData(friends, updatedGroups)
  }

  // 编辑分组
  const handleEditGroup = async (updatedGroup) => {
    const updatedGroups = groups.map(group =>
      group.id === updatedGroup.id ? updatedGroup : group
    )
    setGroups(updatedGroups)
    await saveFriendsData(friends, updatedGroups)
  }

  // 删除分组
  const handleDeleteGroup = async (groupId) => {
    // 将该分组中的好友移动到默认分组
    const updatedFriends = friends.map(friend =>
      friend.groupId === groupId ? { ...friend, groupId: null } : friend
    )
    const updatedGroups = groups.filter(group => group.id !== groupId)
    
    setFriends(updatedFriends)
    setGroups(updatedGroups)
    await saveFriendsData(updatedFriends, updatedGroups)
  }

  // 移动好友到其他分组
  const handleMoveFriend = async (friendId, groupId) => {
    const updatedFriends = friends.map(friend =>
      friend.id === friendId ? { ...friend, groupId } : friend
    )
    setFriends(updatedFriends)
    await saveFriendsData(updatedFriends, groups)
  }

  // 编辑好友备注
  const handleEditFriend = async (friendId, note) => {
    const updatedFriends = friends.map(friend =>
      friend.id === friendId ? { ...friend, note } : friend
    )
    setFriends(updatedFriends)
    await saveFriendsData(updatedFriends, groups)
  }

  // 删除好友
  const handleDeleteFriend = async (friendId) => {
    const updatedFriends = friends.filter(friend => friend.id !== friendId)
    setFriends(updatedFriends)
    await saveFriendsData(updatedFriends, groups)
  }

  // 发送好友请求
  const handleSendFriendRequest = async ({ friendId, note }) => {
    if (!session?.user?.login || !session.accessToken) return

    try {
      const requestId = `fr-${Date.now()}`
      const requestContent = JSON.stringify({
        id: requestId,
        from: session.user.login,
        to: friendId,
        note: note,
        status: 'pending',
        created_at: new Date().toISOString()
      }, null, 2)

      const encodedContent = btoa(unescape(encodeURIComponent(requestContent)))
      
      await fetch(
        `https://api.github.com/repos/${friendId}/dock-chat-data/contents/friend_requests/${requestId}.json`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${session.accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            message: `Friend request from ${session.user.login}`,
            content: encodedContent
          })
        }
      )

      alert('好友请求已发送')
    } catch (error) {
      console.error('Error sending friend request:', error)
      alert('发送好友请求失败，请重试')
    }
  }

  // 处理添加推荐好友
  const handleAddRecommendedFriend = (user) => {
    setSelectedFriend(user)
    setShowAddFriend(true)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-500 border-t-transparent"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900">
      {/* 顶部栏 */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-gray-200 dark:border-gray-700">
        <h1 className="text-xl font-semibold text-gray-900 dark:text-white">好友管理</h1>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setCurrentView('list')}
            className={`p-2 rounded-md ${
              currentView === 'list'
                ? 'bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300'
                : 'hover:bg-gray-100 dark:hover:bg-gray-800'
            }`}
          >
            <UserGroupIcon className="w-5 h-5" />
          </button>
          <button
            onClick={() => setCurrentView('recommendations')}
            className={`p-2 rounded-md ${
              currentView === 'recommendations'
                ? 'bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300'
                : 'hover:bg-gray-100 dark:hover:bg-gray-800'
            }`}
          >
            <UserPlusIcon className="w-5 h-5" />
          </button>
          {selectedFriend && (
            <button
              onClick={() => setCurrentView('activity')}
              className={`p-2 rounded-md ${
                currentView === 'activity'
                  ? 'bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300'
                  : 'hover:bg-gray-100 dark:hover:bg-gray-800'
              }`}
            >
              <ChartBarIcon className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* 主要内容区域 */}
      <div className="flex-1 h-[calc(100vh-4rem)]">
        {currentView === 'list' && (
          <FriendGroups
            friends={friends}
            groups={groups}
            onCreateGroup={handleCreateGroup}
            onEditGroup={handleEditGroup}
            onDeleteGroup={handleDeleteGroup}
            onMoveFriend={handleMoveFriend}
            onEditFriend={(friend) => {
              setSelectedFriend(friend)
              setShowEditFriend(true)
            }}
            onDeleteFriend={handleDeleteFriend}
            onSelectFriend={(friend) => {
              setSelectedFriend(friend)
              setCurrentView('activity')
            }}
          />
        )}

        {currentView === 'recommendations' && (
          <div className="p-4">
            <FriendRecommendations
              session={session}
              onAddFriend={handleAddRecommendedFriend}
            />
          </div>
        )}

        {currentView === 'activity' && selectedFriend && (
          <div className="p-4">
            <FriendActivity
              session={session}
              friend={selectedFriend}
            />
          </div>
        )}
      </div>

      {/* 模态框 */}
      {showAddFriend && (
        <AddFriendModal
          isOpen={showAddFriend}
          onClose={() => setShowAddFriend(false)}
          onSendRequest={handleSendFriendRequest}
          preselectedUser={selectedFriend}
        />
      )}
      {showEditFriend && selectedFriend && (
        <EditFriendModal
          isOpen={showEditFriend}
          onClose={() => {
            setShowEditFriend(false)
            setSelectedFriend(null)
          }}
          friend={selectedFriend}
          onSave={handleEditFriend}
        />
      )}
    </div>
  )
} 