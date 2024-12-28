import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { uploadToGitHub } from '@/lib/github'

export async function POST(request) {
  try {
    // 获取会话信息
    const session = await getSession()
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // 获取上传的文件
    const formData = await request.formData()
    const file = formData.get('file')
    if (!file) {
      return NextResponse.json(
        { error: 'No file uploaded' },
        { status: 400 }
      )
    }

    // 生成文件路径
    const timestamp = new Date().getTime()
    const fileName = `${timestamp}-${file.name}`
    const filePath = `uploads/${session.user.login}/${fileName}`

    // 将文件上传到 GitHub
    const buffer = Buffer.from(await file.arrayBuffer())
    const url = await uploadToGitHub(
      session.accessToken,
      session.user.login,
      filePath,
      buffer
    )

    return NextResponse.json({ url })
  } catch (error) {
    console.error('Failed to upload file:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 