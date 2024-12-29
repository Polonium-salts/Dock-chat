import { NextResponse } from 'next/server'
import cheerio from 'cheerio'

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
    const $ = cheerio.load(html)

    // 解析表情包数据
    const emojis = []
    $('.tagbqppdiv').each((i, el) => {
      const $el = $(el)
      const $img = $el.find('img.lazy')
      const title = $img.attr('title') || ''
      const url = $img.attr('data-original') || ''
      
      if (url) {
        emojis.push({
          id: `emoji-${Date.now()}-${i}`,
          title,
          url,
          source: 'fabiaoqing'
        })
      }
    })

    return NextResponse.json({ emojis })
  } catch (error) {
    console.error('Error searching emojis:', error)
    return NextResponse.json(
      { error: '获取表情包失败' },
      { status: 500 }
    )
  }
} 