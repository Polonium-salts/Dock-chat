import { NextResponse } from 'next/server';
import Parser from 'rss-parser';

export async function POST(req) {
  try {
    const { url } = await req.json();
    
    if (!url) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }

    // 首先尝试获取内容
    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
          'Accept': 'application/rss+xml, application/atom+xml, application/xml, text/xml, */*'
        },
        redirect: 'follow',
        follow: 5
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch feed: ${response.status} ${response.statusText}`);
      }

      const feedText = await response.text();

      const parser = new Parser({
        defaultRSS: 2.0,
        customFields: {
          feed: ['subtitle', 'updated'],
          item: [
            'content:encoded',
            'description',
            'content',
            'summary',
            'published',
            'updated'
          ]
        }
      });

      try {
        const feed = await parser.parseString(feedText);
        
        return NextResponse.json({
          title: feed.title || feed.subtitle || 'Untitled Feed',
          description: feed.description || feed.subtitle || '',
          items: feed.items.map(item => ({
            guid: item.guid || item.id || item.link,
            title: item.title || 'Untitled Item',
            link: item.link || '',
            pubDate: item.pubDate || item.published || item.isoDate || item.updated,
            isoDate: item.isoDate || item.published || item.updated,
            contentSnippet: item.contentSnippet || item.summary || '',
            content: item.content || item['content:encoded'] || item.description || item.summary || '',
            'content:encoded': item['content:encoded'] || item.content || item.description || '',
            description: item.description || item.summary || item.contentSnippet || ''
          }))
        });
      } catch (parseError) {
        console.error('Error parsing feed:', parseError);
        return NextResponse.json({ 
          error: 'Failed to parse feed content: ' + parseError.message 
        }, { status: 422 });
      }
    } catch (fetchError) {
      console.error('Error fetching feed:', fetchError);
      return NextResponse.json({ 
        error: 'Failed to fetch feed: ' + fetchError.message 
      }, { status: 500 });
    }
  } catch (error) {
    console.error('General error:', error);
    return NextResponse.json({ 
      error: 'Error processing request: ' + error.message 
    }, { status: 500 });
  }
} 