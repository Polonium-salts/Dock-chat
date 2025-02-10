import { NextResponse } from 'next/server';
import Parser from 'rss-parser';

export async function POST(req) {
  try {
    const { url } = await req.json();
    
    if (!url) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }

    const parser = new Parser({
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'application/rss+xml, application/atom+xml, application/xml, text/xml, */*'
      },
      defaultRSS: 2.0,
      maxRedirects: 5,
      timeout: 10000,
      customFields: {
        item: ['content:encoded', 'description', 'content']
      }
    });

    try {
      const feed = await parser.parseURL(url);
      
      return NextResponse.json({
        title: feed.title,
        description: feed.description,
        items: feed.items.map(item => ({
          guid: item.guid,
          title: item.title,
          link: item.link,
          pubDate: item.pubDate,
          isoDate: item.isoDate,
          contentSnippet: item.contentSnippet,
          content: item.content,
          'content:encoded': item['content:encoded'],
          description: item.description
        }))
      });
    } catch (parseError) {
      console.error('Error parsing feed:', parseError);
      return NextResponse.json({ 
        error: 'Failed to parse feed content' 
      }, { status: 422 });
    }
  } catch (error) {
    console.error('Error fetching feed:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch feed: ' + error.message 
    }, { status: 500 });
  }
} 