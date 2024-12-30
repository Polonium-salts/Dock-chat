import { NextResponse } from 'next/server'
import { Octokit } from '@octokit/rest'

// 从 fabiaoqing.com 获取表情包
async function fetchEmojisFromFabiaoqing(page = 1) {
  try {
    const response = await fetch(`https://fabiaoqing.com/biaoqing/lists/page/${page}.html`)
    const html = await response.text()
    
    // 解析 HTML 获取表情包列表
    const emojis = []
    const regex = /<img[^>]+src="([^">]+)"[^>]*>/g
    let match
    while ((match = regex.exec(html)) !== null) {
      if (match[1].endsWith('.gif')) {
        emojis.push({
          url: match[1],
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

// 从 GitHub 仓库获取用户上传的表情包
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
        .filter(file => file.name.match(/\.(gif|png|jpg|jpeg)$/i))
        .map(file => ({
          url: file.download_url,
          name: file.name,
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

    // 获取查询参数
    const { searchParams } = new URL(request.url)
    const source = searchParams.get('source') // 'fabiaoqing' 或 'user'
    const page = parseInt(searchParams.get('page') || '1')

    let emojis = []
    if (!source || source === 'fabiaoqing') {
      emojis = await fetchEmojisFromFabiaoqing(page)
    }
    if (!source || source === 'user') {
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

// 上传表情包
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
    
    if (!file || !file.name.match(/\.(gif|png|jpg|jpeg)$/i)) {
      return NextResponse.json(
        { error: '无效的文件格式' },
        { status: 400 }
      )
    }

    // 读取文件内容
    const buffer = Buffer.from(await file.arrayBuffer())
    const content = buffer.toString('base64')

    // 上传到 GitHub
    const path = `emojis/${Date.now()}-${file.name}`
    const response = await octokit.repos.createOrUpdateFileContents({
      owner: user.login,
      repo: 'dock-chat-data',
      path,
      message: `上传表情包: ${file.name}`,
      content,
      branch: 'main'
    })

    return NextResponse.json({
      url: response.data.content.download_url,
      name: file.name
    })
  } catch (error) {
    console.error('Error uploading emoji:', error)
    return NextResponse.json(
      { error: '上传表情包失败' },
      { status: 500 }
    )
  }
} 