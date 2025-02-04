import { NextResponse } from 'next/server';
import { XMLParser } from 'fast-xml-parser';
import * as cheerio from 'cheerio';

export async function POST(req) {
  try {
    const { url } = await req.json();
    
    // 规范化 URL
    let targetUrl = url;
    if (!url.startsWith('http')) {
      targetUrl = 'https://' + url;
    }

    const headers = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      'Accept': 'application/rss+xml, application/atom+xml, application/xml, text/xml, text/html, */*'
    };

    // 存储发现的 feeds
    const feeds = new Set();

    // 尝试直接获取 URL 内容
    const response = await fetch(targetUrl, { headers });
    const contentType = response.headers.get('content-type')?.toLowerCase() || '';
    const text = await response.text();

    // 检查是否是 RSS/Atom feed
    const isXml = contentType.includes('xml') || 
                 contentType.includes('rss') || 
                 contentType.includes('atom') ||
                 text.includes('<?xml') ||
                 text.includes('<rss') ||
                 text.includes('<feed');

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
        '/feeds/posts/default'
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
    const parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: "@_",
      parseAttributeValue: true,
      trimValues: true,
      parseTagValue: true
    });
    
    const result = parser.parse(text);
    
    // RSS 2.0
    if (result.rss?.channel) {
      return {
        title: result.rss.channel.title || 'RSS Feed',
        url: url,
        type: 'rss'
      };
    }
    
    // Atom
    if (result.feed) {
      return {
        title: result.feed.title || 'Atom Feed',
        url: url,
        type: 'atom'
      };
    }
    
    // RSS 1.0
    if (result.rdf?.channel || result['rdf:RDF']?.channel) {
      const channel = result.rdf?.channel || result['rdf:RDF']?.channel;
      return {
        title: channel.title || 'RDF Feed',
        url: url,
        type: 'rdf'
      };
    }

    return null;
  } catch (error) {
    console.warn('Failed to parse feed:', error);
    return null;
  }
} 