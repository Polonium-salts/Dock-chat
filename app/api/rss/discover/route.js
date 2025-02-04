import { NextResponse } from 'next/server';
import { XMLParser } from 'fast-xml-parser';
import * as cheerio from 'cheerio';

export async function POST(req) {
  try {
    const { url } = await req.json();
    
    // 规范化 URL
    let targetUrl = url;
    if (!url.startsWith('http')) {
      // 检查是否是 RSSHub 路径
      if (url.startsWith('/')) {
        targetUrl = `https://rsshub.app${url}`;
      } else {
        targetUrl = `https://${url}`;
      }
    } else if (url.includes('rsshub.app') || url.includes('rss.') || url.toLowerCase().includes('/feed')) {
      // 对于 RSSHub 和明确的 RSS URL，直接尝试解析
      try {
        const response = await fetch(targetUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            'Accept': 'application/rss+xml, application/atom+xml, application/xml, text/xml, */*'
          }
        });
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const text = await response.text();
        const feedInfo = await parseFeed(text, targetUrl);
        
        if (feedInfo) {
          return NextResponse.json({ feeds: [feedInfo] });
        }
      } catch (error) {
        console.error('Failed to parse direct RSS feed:', error);
      }
    }

    const headers = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      'Accept': '*/*'
    };

    // 存储发现的 feeds
    const feeds = new Set();

    try {
      // 尝试直接获取 URL 内容
      const response = await fetch(targetUrl, { headers });
      const contentType = response.headers.get('content-type')?.toLowerCase() || '';
      const text = await response.text();

      // 检查是否是 XML 内容
      const isXml = text.trim().startsWith('<?xml') || 
                   text.trim().startsWith('<rss') || 
                   text.trim().startsWith('<feed') ||
                   contentType.includes('xml') || 
                   contentType.includes('rss') || 
                   contentType.includes('atom');

      if (isXml) {
        try {
          const feedInfo = await parseFeed(text, targetUrl);
          if (feedInfo) {
            feeds.add(JSON.stringify(feedInfo));
          }
        } catch (e) {
          console.warn('Failed to parse direct feed:', e);
        }
      }

      // 如果不是 feed 或解析失败，尝试在 HTML 中查找 feed 链接
      if (feeds.size === 0 && (contentType.includes('html') || text.includes('<!DOCTYPE html>'))) {
        const $ = cheerio.load(text);
        
        // 查找所有可能的 feed 链接
        const feedLinks = new Set();
        
        // 查找 link 标签中的 feed
        $('link[type*="rss"], link[type*="atom"], link[type*="xml"], link[rel="alternate"][type*="xml"], link[rel="alternate"][type*="rss"], link[rel="alternate"][type*="atom"]').each((_, el) => {
          const href = $(el).attr('href');
          if (href) feedLinks.add(href);
        });

        // 查找 a 标签中的 feed 链接
        $('a[href*="feed"], a[href*="rss"], a[href*="atom"], a[href*=".xml"], a[href*="syndication"]').each((_, el) => {
          const href = $(el).attr('href');
          if (href) feedLinks.add(href);
        });

        // 检查所有发现的链接
        for (const link of feedLinks) {
          try {
            const feedUrl = new URL(link, targetUrl).href;
            const feedResponse = await fetch(feedUrl, { headers });
            const feedText = await feedResponse.text();
            
            const feedInfo = await parseFeed(feedText, feedUrl);
            if (feedInfo) {
              feeds.add(JSON.stringify(feedInfo));
            }
          } catch (e) {
            console.warn('Failed to check feed link:', e);
          }
        }

        // 检查常见的 feed 路径
        const commonPaths = [
          '/feed',
          '/rss',
          '/feed.xml',
          '/rss.xml',
          '/atom.xml',
          '/index.xml',
          '/feed/posts',
          '/rss/posts',
          '/blog/feed',
          '/blog.xml',
          '/feed/atom',
          '/feeds/posts/default',
          // RSSHub 常见路径
          '/rsshub/routes',
          '/rsshub/feed'
        ];

        for (const path of commonPaths) {
          try {
            const feedUrl = new URL(path, targetUrl).href;
            const feedResponse = await fetch(feedUrl, { headers });
            if (feedResponse.ok) {
              const feedText = await feedResponse.text();
              const feedInfo = await parseFeed(feedText, feedUrl);
              if (feedInfo) {
                feeds.add(JSON.stringify(feedInfo));
              }
            }
          } catch (e) {
            console.warn(`Failed to check common path ${path}:`, e);
          }
        }
      }
    } catch (e) {
      console.error('Failed to fetch URL:', e);
      // 如果是 XML 文件，尝试直接解析
      if (targetUrl.toLowerCase().endsWith('.xml')) {
        try {
          const response = await fetch(targetUrl, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
              'Accept': 'application/xml, text/xml, */*'
            }
          });
          
          if (response.ok) {
            const text = await response.text();
            const feedInfo = await parseFeed(text, targetUrl);
            if (feedInfo) {
              feeds.add(JSON.stringify(feedInfo));
            }
          }
        } catch (xmlError) {
          console.error('Failed to parse XML file:', xmlError);
        }
      }
    }

    // 转换发现的 feeds
    const discoveredFeeds = Array.from(feeds).map(feed => JSON.parse(feed));
    
    if (discoveredFeeds.length === 0) {
      return NextResponse.json({ 
        error: 'No RSS feeds found on the website' 
      }, { status: 404 });
    }

    return NextResponse.json({ feeds: discoveredFeeds });
    
  } catch (error) {
    console.error('Error discovering feeds:', error);
    return NextResponse.json({ 
      error: 'Failed to discover RSS feeds: ' + error.message 
    }, { status: 500 });
  }
}

async function parseFeed(text, url) {
  try {
    // 移除 BOM 标记
    const cleanText = text.replace(/^\uFEFF/, '');
    
    const parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: "@_",
      parseAttributeValue: true,
      trimValues: true,
      parseTagValue: true,
      allowBooleanAttributes: true,
      // 添加对 CDATA 的支持
      cdataTagName: "__cdata",
      cdataPositionChar: "\\c"
    });
    
    const result = parser.parse(cleanText);
    
    // RSS 2.0
    if (result.rss?.channel) {
      const channel = result.rss.channel;
      return {
        title: channel.title || 'RSS Feed',
        url: url,
        type: 'rss',
        description: channel.description || '',
        image: channel.image?.url || channel.image?.link || '',
        language: channel.language || 'en',
        lastBuildDate: channel.lastBuildDate || channel.pubDate || ''
      };
    }
    
    // Atom
    if (result.feed) {
      const feed = result.feed;
      return {
        title: feed.title || 'Atom Feed',
        url: url,
        type: 'atom',
        description: feed.subtitle || feed.description || '',
        image: feed.logo || feed.icon || '',
        language: feed.lang || 'en',
        lastBuildDate: feed.updated || ''
      };
    }
    
    // RSS 1.0
    if (result.rdf?.channel || result['rdf:RDF']?.channel) {
      const channel = result.rdf?.channel || result['rdf:RDF']?.channel;
      return {
        title: channel.title || 'RDF Feed',
        url: url,
        type: 'rdf',
        description: channel.description || '',
        image: channel.image?.url || channel.image?.['rdf:resource'] || '',
        language: channel.language || 'en',
        lastBuildDate: channel.date || ''
      };
    }

    return null;
  } catch (error) {
    console.warn('Failed to parse feed:', error);
    return null;
  }
} 