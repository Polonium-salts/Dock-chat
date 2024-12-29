import { NextResponse } from 'next/server'
import { Octokit } from '@octokit/rest'
import { Buffer } from 'buffer'

export async function POST(request) {
  try {
    const formData = await request.formData()
    const file = formData.get('file')
    const repo = formData.get('repo')
    const authHeader = request.headers.get('authorization')
    
    if (!file || !repo || !authHeader) {
      return NextResponse.json(
        { error: '缺少必要参数' },
        { status: 400 }
      )
    }

    const token = authHeader.replace('Bearer ', '')
    const octokit = new Octokit({ auth: token })

    // 读取文件内容
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    const content = buffer.toString('base64')

    // 上传文件到 GitHub
    const [owner, repoName] = repo.split('/')
    const path = `source-code/${Date.now()}-${file.name}`

    const response = await octokit.repos.createOrUpdateFileContents({
      owner,
      repo: repoName,
      path,
      message: `上传源代码文件: ${file.name}`,
      content,
      branch: 'main'
    })

    return NextResponse.json({
      url: response.data.content.download_url
    })
  } catch (error) {
    console.error('Error uploading source code:', error)
    return NextResponse.json(
      { error: '上传源代码失败' },
      { status: 500 }
    )
  }
} 