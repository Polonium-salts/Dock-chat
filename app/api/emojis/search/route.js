import { NextResponse } from 'next/server'

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const query = searchParams.get('q') || ''
    const page = parseInt(searchParams.get('page')) || 1

    // 构建搜索 URL
    const searchUrl = query
      ? `https://fabiaoqing.com/search/search/keyword/${encodeURIComponent(query)}/page/${page}.html`
      : `https://fabiaoqing.com/biaoqing/lists/page/${page}.html`

    // 获取表情包列表页面
    const response = await fetch(searchUrl)
    const html = await response.text()

    // 使用正则表达式提取图片信息
    const imgRegex = /<img[^>]+class="lazy"[^>]+title="([^"]+)"[^>]+data-original="([^"]+)"[^>]*>/g
    const emojis = []
    let match

    while ((match = imgRegex.exec(html)) !== null) {
      const [, title, url] = match
      if (url) {
        emojis.push({
          id: `emoji-${Date.now()}-${emojis.length}`,
          title,
          url,
          source: 'fabiaoqing'
        })
      }
    }

    return NextResponse.json({ emojis })
  } catch (error) {
    console.error('Error searching emojis:', error)
    return NextResponse.json(
      { error: '获取表情包失败' },
      { status: 500 }
    )
  }
} 