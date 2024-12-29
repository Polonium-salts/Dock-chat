import { NextResponse } from 'next/server'
import { Octokit } from '@octokit/rest'

// 从 fabiaoqing.com 获取表情包
async function fetchEmojisFromFabiaoqing(page = 1) {
  try {
    const response = await fetch(`https://fabiaoqing.com/biaoqing/lists/page/${page}.html`)
    const html = await response.text()
    
    // 使用正则表达式提取图片信息
    const imgPattern = /<img[^>]*title="([^"]*)"[^>]*data-original="([^"]*)"[^>]*>/g
    const emojis = []
    let match

    while ((match = imgPattern.exec(html)) !== null) {
      const [_, title, url] = match
      if (url && title) {
        emojis.push({
          title,
          url,
          source: 'fabiaoqing'
        })
      }
    }

    return emojis
  } catch (error) {
    console.error('Error fetching emojis from fabiaoqing:', error)
    return []
  }
}

// 从用户的 GitHub 仓库获取自定义表情包
async function fetchUserEmojis(octokit, owner) {
  try {
    const response = await octokit.repos.getContent({
      owner,
      repo: 'dock-chat-data',
      path: 'emojis',
      ref: 'main'
    })

    if (Array.isArray(response.data)) {
      return response.data
        .filter(file => file.type === 'file' && file.name.match(/\.(gif|png|jpg|jpeg)$/i))
        .map(file => ({
          title: file.name.replace(/\.[^/.]+$/, ''),
          url: file.download_url,
          source: 'user'
        }))
    }
    return []
  } catch (error) {
    if (error.status !== 404) {
      console.error('Error fetching user emojis:', error)
    }
    return []
  }
}

// 获取表情包列表
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page')) || 1
    const source = searchParams.get('source') || 'all'
    const authHeader = request.headers.get('authorization')

    if (!authHeader) {
      return NextResponse.json(
        { error: '未授权' },
        { status: 401 }
      )
    }

    const token = authHeader.replace('Bearer ', '')
    const octokit = new Octokit({ auth: token })
    const { data: user } = await octokit.users.getAuthenticated()

    let emojis = []

    // 根据来源获取表情包
    if (source === 'all' || source === 'fabiaoqing') {
      const fabiaoqingEmojis = await fetchEmojisFromFabiaoqing(page)
      emojis = [...emojis, ...fabiaoqingEmojis]
    }

    if (source === 'all' || source === 'user') {
      const userEmojis = await fetchUserEmojis(octokit, user.login)
      emojis = [...emojis, ...userEmojis]
    }

    return NextResponse.json({ emojis })
  } catch (error) {
    console.error('Error getting emojis:', error)
    return NextResponse.json(
      { error: '获取表情包失败' },
      { status: 500 }
    )
  }
}

// 上传自定义表情包
export async function POST(request) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json(
        { error: '未授权' },
        { status: 401 }
      )
    }

    const token = authHeader.replace('Bearer ', '')
    const octokit = new Octokit({ auth: token })
    const { data: user } = await octokit.users.getAuthenticated()

    const formData = await request.formData()
    const file = formData.get('file')
    const title = formData.get('title')

    if (!file || !title) {
      return NextResponse.json(
        { error: '缺少必要参数' },
        { status: 400 }
      )
    }

    // 读取文件内容
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    const content = buffer.toString('base64')

    // 上传到 GitHub
    const path = `emojis/${Date.now()}-${title}.gif`
    
    try {
      const response = await octokit.repos.createOrUpdateFileContents({
        owner: user.login,
        repo: 'dock-chat-data',
        path,
        message: `上传表情包: ${title}`,
        content,
        branch: 'main'
      })

      return NextResponse.json({
        url: response.data.content.download_url,
        title
      })
    } catch (error) {
      if (error.status === 404) {
        // 如果目录不存在，先创建目录
        await octokit.repos.createOrUpdateFileContents({
          owner: user.login,
          repo: 'dock-chat-data',
          path: 'emojis/.gitkeep',
          message: '创建表情包目录',
          content: '',
          branch: 'main'
        })

        // 再次尝试上传文件
        const response = await octokit.repos.createOrUpdateFileContents({
          owner: user.login,
          repo: 'dock-chat-data',
          path,
          message: `上传表情包: ${title}`,
          content,
          branch: 'main'
        })

        return NextResponse.json({
          url: response.data.content.download_url,
          title
        })
      }
      throw error
    }
  } catch (error) {
    console.error('Error uploading emoji:', error)
    return NextResponse.json(
      { error: '上传表情包失败' },
      { status: 500 }
    )
  }
} 