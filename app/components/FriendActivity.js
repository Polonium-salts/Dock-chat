'use client'

import { useState, useEffect } from 'react'
import { StarIcon, GitBranchIcon, IssueOpenedIcon } from '@heroicons/react/24/outline'

export default function FriendActivity({ session, friend }) {
  const [activities, setActivities] = useState([])
  const [commonInterests, setCommonInterests] = useState([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const loadActivities = async () => {
      if (!session?.user?.login || !session.accessToken || !friend?.login) return

      try {
        setIsLoading(true)

        // 获取好友的最近活动
        const eventsResponse = await fetch(
          `https://api.github.com/users/${friend.login}/events/public`,
          {
            headers: {
              'Authorization': `Bearer ${session.accessToken}`,
              'Accept': 'application/vnd.github.v3+json'
            }
          }
        )
        const events = await eventsResponse.json()

        // 获取好友的仓库
        const friendReposResponse = await fetch(
          `https://api.github.com/users/${friend.login}/repos?sort=updated&per_page=100`,
          {
            headers: {
              'Authorization': `Bearer ${session.accessToken}`,
              'Accept': 'application/vnd.github.v3+json'
            }
          }
        )
        const friendRepos = await friendReposResponse.json()

        // 获取当前用户的仓库
        const userReposResponse = await fetch(
          `https://api.github.com/users/${session.user.login}/repos?sort=updated&per_page=100`,
          {
            headers: {
              'Authorization': `Bearer ${session.accessToken}`,
              'Accept': 'application/vnd.github.v3+json'
            }
          }
        )
        const userRepos = await userReposResponse.json()

        // 查找共同的语言和主题
        const userLanguages = new Set(userRepos.map(repo => repo.language).filter(Boolean))
        const userTopics = new Set(userRepos.flatMap(repo => repo.topics || []))

        const commonLanguages = friendRepos
          .map(repo => repo.language)
          .filter(language => language && userLanguages.has(language))

        const commonTopics = friendRepos
          .flatMap(repo => repo.topics || [])
          .filter(topic => userTopics.has(topic))

        // 查找共同关注的仓库
        const userStarredResponse = await fetch(
          `https://api.github.com/users/${session.user.login}/starred`,
          {
            headers: {
              'Authorization': `Bearer ${session.accessToken}`,
              'Accept': 'application/vnd.github.v3+json'
            }
          }
        )
        const userStarred = await userStarredResponse.json()

        const friendStarredResponse = await fetch(
          `https://api.github.com/users/${friend.login}/starred`,
          {
            headers: {
              'Authorization': `Bearer ${session.accessToken}`,
              'Accept': 'application/vnd.github.v3+json'
            }
          }
        )
        const friendStarred = await friendStarredResponse.json()

        const commonStarred = userStarred.filter(userRepo =>
          friendStarred.some(friendRepo => friendRepo.id === userRepo.id)
        )

        setActivities(events)
        setCommonInterests({
          languages: Array.from(new Set(commonLanguages)),
          topics: Array.from(new Set(commonTopics)),
          starred: commonStarred
        })
      } catch (error) {
        console.error('Error loading activities:', error)
      } finally {
        setIsLoading(false)
      }
    }

    loadActivities()
  }, [session, friend])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-500 border-t-transparent"></div>
      </div>
    )
  }

  const formatEventType = (type) => {
    switch (type) {
      case 'PushEvent':
        return '推送了代码'
      case 'CreateEvent':
        return '创建了仓库'
      case 'WatchEvent':
        return '关注了仓库'
      case 'ForkEvent':
        return 'Fork 了仓库'
      case 'IssuesEvent':
        return '创建了 Issue'
      case 'PullRequestEvent':
        return '创建了 Pull Request'
      case 'IssueCommentEvent':
        return '评论了 Issue'
      case 'CommitCommentEvent':
        return '评论了提交'
      default:
        return type
    }
  }

  const formatDate = (date) => {
    const d = new Date(date)
    return d.toLocaleString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return (
    <div className="space-y-6">
      {/* 好友信息 */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4">
        <div className="flex items-center">
          <img
            src={friend.avatar_url}
            alt={friend.login}
            className="w-16 h-16 rounded-full"
          />
          <div className="ml-4">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              {friend.name || friend.login}
            </h2>
            <p className="text-gray-500 dark:text-gray-400">
              {friend.login}
            </p>
            {friend.bio && (
              <p className="mt-1 text-gray-600 dark:text-gray-300">
                {friend.bio}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* 共同兴趣 */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
          共同兴趣
        </h3>
        
        {/* 编程语言 */}
        {commonInterests.languages?.length > 0 && (
          <div className="mb-4">
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              共同使用的编程语言
            </h4>
            <div className="flex flex-wrap gap-2">
              {commonInterests.languages.map(language => (
                <span
                  key={language}
                  className="px-2 py-1 text-sm bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded"
                >
                  {language}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* 主题标签 */}
        {commonInterests.topics?.length > 0 && (
          <div className="mb-4">
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              共同关注的主题
            </h4>
            <div className="flex flex-wrap gap-2">
              {commonInterests.topics.map(topic => (
                <span
                  key={topic}
                  className="px-2 py-1 text-sm bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 rounded"
                >
                  {topic}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* 共同关注的仓库 */}
        {commonInterests.starred?.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              共同关注的仓库
            </h4>
            <ul className="space-y-2">
              {commonInterests.starred.slice(0, 5).map(repo => (
                <li key={repo.id} className="text-sm">
                  <a
                    href={repo.html_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    {repo.full_name}
                  </a>
                  <span className="ml-2 text-gray-500 dark:text-gray-400">
                    ⭐ {repo.stargazers_count}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* 最近活动 */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
          最近活动
        </h3>
        
        {activities.length > 0 ? (
          <ul className="space-y-4">
            {activities.slice(0, 10).map((activity, index) => (
              <li
                key={activity.id || index}
                className="flex items-start space-x-3"
              >
                {activity.type === 'WatchEvent' && (
                  <StarIcon className="w-5 h-5 text-yellow-500" />
                )}
                {activity.type === 'ForkEvent' && (
                  <GitBranchIcon className="w-5 h-5 text-green-500" />
                )}
                {activity.type === 'IssuesEvent' && (
                  <IssueOpenedIcon className="w-5 h-5 text-purple-500" />
                )}
                {!['WatchEvent', 'ForkEvent', 'IssuesEvent'].includes(activity.type) && (
                  <div className="w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-900" />
                )}
                
                <div className="flex-1">
                  <p className="text-gray-600 dark:text-gray-300">
                    {formatEventType(activity.type)}
                    {activity.repo && (
                      <a
                        href={`https://github.com/${activity.repo.name}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="ml-1 text-blue-600 dark:text-blue-400 hover:underline"
                      >
                        {activity.repo.name}
                      </a>
                    )}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {formatDate(activity.created_at)}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-center text-gray-500 dark:text-gray-400">
            暂无活动记录
          </p>
        )}
      </div>
    </div>
  )
} 