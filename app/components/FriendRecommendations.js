'use client'

import { useState, useEffect } from 'react'
import { UserPlusIcon } from '@heroicons/react/24/outline'

export default function FriendRecommendations({ session, onAddFriend }) {
  const [recommendations, setRecommendations] = useState([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const loadRecommendations = async () => {
      if (!session?.user?.login || !session.accessToken) return

      try {
        setIsLoading(true)

        // 获取当前用户关注的人
        const followingResponse = await fetch(
          `https://api.github.com/users/${session.user.login}/following`,
          {
            headers: {
              'Authorization': `Bearer ${session.accessToken}`,
              'Accept': 'application/vnd.github.v3+json'
            }
          }
        )
        const following = await followingResponse.json()

        // 获取每个关注者的关注列表
        const followingFollowers = await Promise.all(
          following.map(async user => {
            const response = await fetch(
              `https://api.github.com/users/${user.login}/following`,
              {
                headers: {
                  'Authorization': `Bearer ${session.accessToken}`,
                  'Accept': 'application/vnd.github.v3+json'
                }
              }
            )
            return await response.json()
          })
        )

        // 统计共同关注的用户
        const commonFollowings = followingFollowers.flat()
          .reduce((acc, user) => {
            acc[user.login] = (acc[user.login] || 0) + 1
            return acc
          }, {})

        // 获取推荐用户的详细信息
        const recommendedUsers = await Promise.all(
          Object.entries(commonFollowings)
            .filter(([login]) => login !== session.user.login)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 5)
            .map(async ([login]) => {
              const response = await fetch(
                `https://api.github.com/users/${login}`,
                {
                  headers: {
                    'Authorization': `Bearer ${session.accessToken}`,
                    'Accept': 'application/vnd.github.v3+json'
                  }
                }
              )
              const user = await response.json()
              return {
                ...user,
                commonCount: commonFollowings[login]
              }
            })
        )

        // 获取每个推荐用户的仓库
        const recommendedUsersWithRepos = await Promise.all(
          recommendedUsers.map(async user => {
            const reposResponse = await fetch(
              `https://api.github.com/users/${user.login}/repos?sort=updated&per_page=5`,
              {
                headers: {
                  'Authorization': `Bearer ${session.accessToken}`,
                  'Accept': 'application/vnd.github.v3+json'
                }
              }
            )
            const repos = await reposResponse.json()
            return {
              ...user,
              repos: repos.map(repo => ({
                name: repo.name,
                description: repo.description,
                language: repo.language,
                stars: repo.stargazers_count
              }))
            }
          })
        )

        setRecommendations(recommendedUsersWithRepos)
      } catch (error) {
        console.error('Error loading recommendations:', error)
      } finally {
        setIsLoading(false)
      }
    }

    loadRecommendations()
  }, [session])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-500 border-t-transparent"></div>
      </div>
    )
  }

  if (recommendations.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500 dark:text-gray-400">
        暂无推荐好友
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {recommendations.map(user => (
        <div
          key={user.id}
          className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden"
        >
          <div className="p-4">
            <div className="flex items-start justify-between">
              <div className="flex items-center">
                <img
                  src={user.avatar_url}
                  alt={user.login}
                  className="w-12 h-12 rounded-full"
                />
                <div className="ml-3">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                    {user.name || user.login}
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {user.login}
                  </p>
                </div>
              </div>
              <button
                onClick={() => onAddFriend(user)}
                className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-800"
              >
                <UserPlusIcon className="w-5 h-5" />
              </button>
            </div>
            
            <div className="mt-4">
              <p className="text-sm text-gray-600 dark:text-gray-300">
                {user.bio || '暂无个人简介'}
              </p>
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                {user.commonCount} 个共同关注
              </p>
            </div>

            {user.repos?.length > 0 && (
              <div className="mt-4">
                <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">
                  最近的仓库
                </h4>
                <ul className="space-y-2">
                  {user.repos.map(repo => (
                    <li
                      key={repo.name}
                      className="text-sm"
                    >
                      <a
                        href={`https://github.com/${user.login}/${repo.name}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 dark:text-blue-400 hover:underline"
                      >
                        {repo.name}
                      </a>
                      {repo.language && (
                        <span className="ml-2 text-gray-500 dark:text-gray-400">
                          {repo.language}
                        </span>
                      )}
                      {repo.stars > 0 && (
                        <span className="ml-2 text-gray-500 dark:text-gray-400">
                          ⭐ {repo.stars}
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  )
} 