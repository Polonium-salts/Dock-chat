export class RssService {
  // 从网站 URL 发现 RSS 订阅源
  static async discoverFeeds(url) {
    try {
      const response = await fetch('/api/rss/discover', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to discover RSS feeds');
      }

      const { feeds } = await response.json();
      return feeds;
    } catch (error) {
      console.error('Error discovering feeds:', error);
      throw error;
    }
  }

  // 验证 RSS 订阅源
  static async validateFeed(url) {
    try {
      const response = await fetch('/api/rss/discover', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url }),
      });

      if (!response.ok) {
        throw new Error('Invalid RSS feed');
      }

      const { feeds } = await response.json();
      return feeds.length > 0;
    } catch (error) {
      console.error('Error validating feed:', error);
      throw new Error('Invalid RSS feed');
    }
  }
} 