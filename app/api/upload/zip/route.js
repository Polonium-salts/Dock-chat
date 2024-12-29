import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { NextResponse } from 'next/server'
import { writeFile } from 'fs/promises'
import { join } from 'path'
import { v4 as uuidv4 } from 'uuid'
import AdmZip from 'adm-zip'

export async function POST(request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ message: '未授权' }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get('file')

    if (!file) {
      return NextResponse.json({ message: '请上传文件' }, { status: 400 })
    }

    // 验证文件类型
    if (file.type !== 'application/zip') {
      return NextResponse.json({ message: '请上传 ZIP 文件' }, { status: 400 })
    }

    // 生成唯一的临时文件名
    const tempFileName = `${uuidv4()}.zip`
    const tempFilePath = join(process.cwd(), 'tmp', tempFileName)

    // 将文件保存到临时目录
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    await writeFile(tempFilePath, buffer)

    // 解压并读取 ZIP 文件内容
    const zip = new AdmZip(tempFilePath)
    const zipEntries = zip.getEntries()

    // 验证 ZIP 文件结构
    const requiredFiles = ['index.html', 'manifest.json']
    const missingFiles = requiredFiles.filter(file => 
      !zipEntries.some(entry => entry.entryName === file)
    )

    if (missingFiles.length > 0) {
      return NextResponse.json({
        message: `ZIP 文件缺少必要的文件: ${missingFiles.join(', ')}`
      }, { status: 400 })
    }

    // 读取清单文件
    const manifestEntry = zipEntries.find(entry => entry.entryName === 'manifest.json')
    const manifestContent = JSON.parse(manifestEntry.getData().toString('utf8'))

    // 验证清单文件
    const requiredFields = ['name', 'version', 'description', 'author', 'main']
    const missingFields = requiredFields.filter(field => !manifestContent[field])

    if (missingFields.length > 0) {
      return NextResponse.json({
        message: `清单文件缺少必要的字段: ${missingFields.join(', ')}`
      }, { status: 400 })
    }

    // 将 ZIP 内容转换为 Base64
    const sourceCode = buffer.toString('base64')

    // 返回处理结果
    return NextResponse.json({
      sourceCode,
      manifest: manifestContent
    })
  } catch (error) {
    console.error('Error processing ZIP file:', error)
    return NextResponse.json({
      message: error.message || '处理 ZIP 文件失败'
    }, { status: 500 })
  }
} 