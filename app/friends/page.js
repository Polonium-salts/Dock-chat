'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import FriendsPage from '../components/FriendsPage'
import AddFriendModal from '../components/AddFriendModal'
import UserProfileModal from '../components/UserProfileModal'

export default function Friends() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [friends, setFriends] = useState([])
  const [following, setFollowing] = useState([])
  const [showAddFriendModal, setShowAddFriendModal] = useState(false)
  const [showFriendRequestsModal, setShowFriendRequestsModal] = useState(false)
  const [showUserProfileModal, setShowUserProfileModal] = useState(false)
  const [selectedUser, setSelectedUser] = useState(null)
  const [friendRequests, setFriendRequests] = useState([])

  useEffect(() => {
    if (status === 'loading') return

    if (!session) {
      router.push('/') // 未登录用户重定向到首页
      return
    }

    // 加载好友列表
    loadFriends()
  }, [session, status])

  const loadFriends = async () => {
    if (!session?.accessToken || !session.user?.login) return

    try {
      // 加载好友列表
      const friendsResponse = await fetch(`/api/friends?username=${session.user.login}`)
      const friendsData = await friendsResponse.json()
      setFriends(friendsData.friends || [])
      setFollowing(friendsData.following || [])
      setFriendRequests(friendsData.requests || [])
    } catch (error) {
      console.error('Error loading friends:', error)
    }
  }

  const handleAddFriend = async (data) => {
    if (!session?.accessToken || !session.user?.login) return

    try {
      const response = await fetch('/api/friends/request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: session.user.login,
          to: data.friendId,
          note: data.note
        })
      })

      if (response.ok) {
        alert('好友请求已发送')
      } else {
        throw new Error('发送好友请求失败')
      }
    } catch (error) {
      console.error('Error sending friend request:', error)
      alert('发送好友请求失败，请重试')
    }
  }

  const handleStartChat = async (user) => {
    if (!session?.user?.login) return

    try {
      // 创建或获取私聊房间
      const response = await fetch('/api/rooms/private', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user1: session.user.login,
          user2: user.login
        })
      })

      const data = await response.json()
      router.push(`/${session.user.login}/${data.roomId}`)
    } catch (error) {
      console.error('Error starting chat:', error)
      alert('创建私聊失败，请重试')
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg">
          <FriendsPage
            friends={friends}
            following={following}
            onAddFriend={() => setShowAddFriendModal(true)}
            onShowRequests={() => setShowFriendRequestsModal(true)}
            onSelectUser={(user) => {
              setSelectedUser(user)
              setShowUserProfileModal(true)
            }}
          />
        </div>
      </div>

      {/* 模态框 */}
      {showAddFriendModal && (
        <AddFriendModal
          isOpen={showAddFriendModal}
          onClose={() => setShowAddFriendModal(false)}
          onSendRequest={handleAddFriend}
        />
      )}

      {showUserProfileModal && selectedUser && (
        <UserProfileModal
          user={selectedUser}
          onClose={() => {
            setShowUserProfileModal(false)
            setSelectedUser(null)
          }}
          onStartChat={handleStartChat}
          isFriend={friends.some(f => f.login === selectedUser.login)}
          isFollowing={following.some(f => f.login === selectedUser.login)}
        />
      )}
    </div>
  )
} 