'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import FriendsPage from '../components/FriendsPage'
import AddFriendModal from '../components/AddFriendModal'
import FriendRequestsModal from '../components/FriendRequestsModal'
import UserProfileModal from '../components/UserProfileModal'

export default function Friends() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [friends, setFriends] = useState([])
  const [following, setFollowing] = useState([])
  const [friendRequests, setFriendRequests] = useState([])
  const [showAddFriendModal, setShowAddFriendModal] = useState(false)
  const [showFriendRequestsModal, setShowFriendRequestsModal] = useState(false)
  const [showUserProfileModal, setShowUserProfileModal] = useState(false)
  const [selectedUser, setSelectedUser] = useState(null)

  // 检查用户登录状态
  useEffect(() => {
    if (status === 'loading') return
    if (!session) {
      router.push('/') // 未登录用户重定向到首页
    }
  }, [status, session, router])

  // 加载好友列表和关注列表
  useEffect(() => {
    const loadFriendsAndFollowing = async () => {
      if (!session?.accessToken || !session.user?.login) return

      try {
        // 加载好友列表
        const friendsResponse = await fetch(`/api/friends?username=${session.user.login}`)
        const friendsData = await friendsResponse.json()
        setFriends(friendsData)

        // 加载关注列表
        const followingResponse = await fetch(`/api/following?username=${session.user.login}`)
        const followingData = await followingResponse.json()
        setFollowing(followingData)

        // 加载好友请求
        const requestsResponse = await fetch(`/api/friend-requests?username=${session.user.login}`)
        const requestsData = await requestsResponse.json()
        setFriendRequests(requestsData)
      } catch (error) {
        console.error('Error loading friends data:', error)
      }
    }

    loadFriendsAndFollowing()
  }, [session])

  // 处理发送好友请求
  const handleSendFriendRequest = async (data) => {
    if (!session?.accessToken || !session.user?.login) return

    try {
      const response = await fetch('/api/friend-requests', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.accessToken}`
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

  // 处理接受好友请求
  const handleAcceptRequest = async (requestId) => {
    if (!session?.accessToken || !session.user?.login) return

    try {
      const response = await fetch(`/api/friend-requests/${requestId}/accept`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.accessToken}`
        }
      })

      if (response.ok) {
        // 更新好友请求列表
        setFriendRequests(prev => prev.filter(req => req.id !== requestId))
        // 重新加载好友列表
        const friendsResponse = await fetch(`/api/friends?username=${session.user.login}`)
        const friendsData = await friendsResponse.json()
        setFriends(friendsData)
      } else {
        throw new Error('接受好友请求失败')
      }
    } catch (error) {
      console.error('Error accepting friend request:', error)
      alert('接受好友请求失败，请重试')
    }
  }

  // 处理拒绝好友请求
  const handleRejectRequest = async (requestId) => {
    if (!session?.accessToken || !session.user?.login) return

    try {
      const response = await fetch(`/api/friend-requests/${requestId}/reject`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.accessToken}`
        }
      })

      if (response.ok) {
        setFriendRequests(prev => prev.filter(req => req.id !== requestId))
      } else {
        throw new Error('拒绝好友请求失败')
      }
    } catch (error) {
      console.error('Error rejecting friend request:', error)
      alert('拒绝好友请求失败，请重试')
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
          onSendRequest={handleSendFriendRequest}
        />
      )}

      {showFriendRequestsModal && (
        <FriendRequestsModal
          isOpen={showFriendRequestsModal}
          onClose={() => setShowFriendRequestsModal(false)}
          requests={friendRequests}
          onAccept={handleAcceptRequest}
          onReject={handleRejectRequest}
        />
      )}

      {showUserProfileModal && selectedUser && (
        <UserProfileModal
          user={selectedUser}
          onClose={() => {
            setShowUserProfileModal(false)
            setSelectedUser(null)
          }}
          onAddFriend={() => {
            setShowAddFriendModal(true)
            setShowUserProfileModal(false)
          }}
          onStartChat={() => {
            router.push(`/chat/${selectedUser.login}`)
          }}
          isFriend={friends.some(f => f.login === selectedUser.login)}
          isFollowing={following.some(f => f.login === selectedUser.login)}
        />
      )}
    </div>
  )
} 