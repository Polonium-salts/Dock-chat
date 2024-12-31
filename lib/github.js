import { Octokit } from '@octokit/rest'
import { getServerSession } from 'next-auth'
import { authOptions } from './auth'

// 创建 Octokit 实例
export const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN,
})

// 获取带有认证的 Octokit 实例
export async function getAuthenticatedOctokit(req) {
  const session = await getServerSession(req, authOptions)
  if (!session?.accessToken) {
    throw new Error('No access token found')
  }

  return new Octokit({
    auth: session.accessToken,
  })
} 