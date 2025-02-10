import { NextResponse } from 'next/server';

export async function GET(request) {
  try {
    // 获取原始请求的路径和查询参数
    const { pathname, search } = new URL(request.url);
    const path = pathname.replace('/api', '');
    
    // 构建目标 URL
    const targetUrl = `https://wapi.vip247.icu${path}${search}`;

    // 转发请求到目标 URL
    const response = await fetch(targetUrl, {
      headers: {
        'Content-Type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
        'Accept': 'application/json, text/plain, */*',
        'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
        'Origin': 'https://wapi.vip247.icu',
        'Referer': 'https://wapi.vip247.icu/',
      },
    });

    // 检查响应类型
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      // 如果是 JSON 响应，返回解析后的数据
      const data = await response.json();
      return NextResponse.json(data);
    } else {
      // 如果是其他类型（如音频流），直接返回响应
      return new NextResponse(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: {
          'Content-Type': contentType || 'application/octet-stream',
          'Content-Length': response.headers.get('content-length'),
          'Accept-Ranges': 'bytes',
        },
      });
    }
  } catch (error) {
    console.error('API proxy error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
} 