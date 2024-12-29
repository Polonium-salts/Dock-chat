import { NextResponse } from 'next/server'
import axios from 'axios'
import cheerio from 'cheerio'

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const query = searchParams.get('q') || ''
    const page = parseInt(searchParams.get('page')) || 1

    // 构建搜索 URL
    const searchUrl = query
      ? `https://fabiaoqing.com/search/search/keyword/${encodeURIComponent(query)}/type/bq/page/${page}.html`
      : `https://fabiaoqing.com/biaoqing/lists/page/${page}.html`

    // 获取页面内容
    const response = await axios.get(searchUrl)
    const $ = cheerio.load(response.data)

    // 解析表情包列表
    const emojis = []
    $('.tagbqppdiv').each((i, el) => {
      const $el = $(el)
      const $img = $el.find('img.lazy')
      const title = $img.attr('title') || ''
      const url = $img.attr('data-original') || ''
      
      if (url) {
        emojis.push({
          id: `fabiaoqing-${page}-${i}`,
          title,
          url,
          source: 'fabiaoqing'
        })
      }
    })

    return NextResponse.json({
      emojis,
      page,
      hasMore: emojis.length > 0
    })
  } catch (error) {
    console.error('Error fetching emojis:', error)
    return NextResponse.json(
      { error: '获取表情包失败' },
      { status: 500 }
    )
  }
} 