import { useState, useEffect } from 'react'
import useSWR from 'swr'

// 防抖hook
export function useDebounce(value, delay) {
  const [debouncedValue, setDebouncedValue] = useState(value)

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)

    return () => {
      clearTimeout(handler)
    }
  }, [value, delay])

  return debouncedValue
}

// 获取聊天室列表
export function useRooms(session) {
  const { data, error, mutate } = useSWR(
    session ? '/api/rooms' : null,
    async (url) => {
      const response = await fetch(url)
      if (!response.ok) {
        throw new Error('获取聊天室列表失败')
      }
      return response.json()
    }
  )

  return {
    rooms: data,
    isLoading: !error && !data,
    isError: error,
    mutate
  }
}

// 获取聊天室消息
export function useMessages(roomId) {
  const { data, error, mutate } = useSWR(
    roomId ? `/api/rooms/${roomId}/messages` : null,
    async (url) => {
      const response = await fetch(url)
      if (!response.ok) {
        throw new Error('获取消息失败')
      }
      return response.json()
    },
    {
      refreshInterval: 3000 // 每3秒刷新一次
    }
  )

  return {
    messages: data,
    isLoading: !error && !data,
    isError: error,
    mutate
  }
}

// 获取好友列表
export function useFriends(session) {
  const { data, error, mutate } = useSWR(
    session ? '/api/friends' : null,
    async (url) => {
      const response = await fetch(url)
      if (!response.ok) {
        throw new Error('获取好友列表失败')
      }
      return response.json()
    }
  )

  return {
    friends: data?.friends || [],
    following: data?.following || [],
    friendRequests: data?.requests || [],
    isLoading: !error && !data,
    isError: error,
    mutate
  }
}

// 获取用户仓库列表
export function useRepositories(session) {
  const { data, error } = useSWR(
    session ? 'https://api.github.com/user/repos?type=private' : null,
    async (url) => {
      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${session.accessToken}`,
          Accept: 'application/vnd.github.v3+json'
        }
      })
      if (!response.ok) {
        throw new Error('获取仓库列表失败')
      }
      return response.json()
    }
  )

  return {
    repositories: data?.filter(repo => repo.permissions?.push) || [],
    isLoading: !error && !data,
    isError: error
  }
}

// 搜索用户
export function useUserSearch(query, session) {
  const debouncedQuery = useDebounce(query, 300)

  const { data, error } = useSWR(
    debouncedQuery && session ? `https://api.github.com/search/users?q=${debouncedQuery}` : null,
    async (url) => {
      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${session.accessToken}`,
          Accept: 'application/vnd.github.v3+json'
        }
      })
      if (!response.ok) {
        throw new Error('搜索用户失败')
      }
      return response.json()
    }
  )

  return {
    users: data?.items || [],
    isLoading: !error && !data && !!debouncedQuery,
    isError: error
  }
}

// 获取用户信息
export function useUserProfile(username, session) {
  const { data, error } = useSWR(
    username && session ? `https://api.github.com/users/${username}` : null,
    async (url) => {
      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${session.accessToken}`,
          Accept: 'application/vnd.github.v3+json'
        }
      })
      if (!response.ok) {
        throw new Error('获取用户信息失败')
      }
      return response.json()
    }
  )

  return {
    profile: data,
    isLoading: !error && !data,
    isError: error
  }
} 