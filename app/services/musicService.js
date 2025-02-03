export class MusicService {
  constructor(config) {
    if (!config) {
      throw new Error('Music service configuration is required');
    }

    this.config = config;
    this.sourceType = config.type || 'api'; // 'api' or 'source'
    this.apiEndpoint = config.apiEndpoint;
    this.sourceUrl = config.sourceUrl;
    // 添加代理前缀
    this.proxyUrl = '/api';

    // Validate configuration
    if (this.sourceType === 'api' && !this.apiEndpoint) {
      throw new Error('API endpoint is required when using API source type');
    }
    if (this.sourceType === 'source' && !this.sourceUrl) {
      throw new Error('Source URL is required when using direct source type');
    }
  }

  // 构建API URL
  buildApiUrl(path) {
    if (!this.apiEndpoint) {
      throw new Error('API endpoint is not configured');
    }
    return `${this.proxyUrl}${path}`;
  }

  // 通用请求方法
  async fetchWithHeaders(url, options = {}) {
    if (!url) {
      throw new Error('URL is required for making requests');
    }

    const headers = {
      'Content-Type': 'application/json',
      'X-Requested-With': 'XMLHttpRequest',
    };

    const response = await fetch(url, {
      ...options,
      headers: {
        ...headers,
        ...options.headers,
      },
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return response.json();
  }

  async searchSongs(keyword) {
    if (!keyword || typeof keyword !== 'string' || !keyword.trim()) {
      throw new Error('Valid search keyword is required');
    }

    if (this.sourceType === 'api') {
      if (!this.apiEndpoint) {
        throw new Error('API endpoint is not configured');
      }
      return this.searchSongsViaApi(keyword);
    } else {
      if (!this.sourceUrl) {
        throw new Error('Source URL is not configured');
      }
      return this.searchSongsViaSource(keyword);
    }
  }

  async searchSongsViaApi(keyword) {
    try {
      const data = await this.fetchWithHeaders(
        this.buildApiUrl(`/search?keywords=${encodeURIComponent(keyword)}&limit=30`)
      );

      if (!data.result || !data.result.songs) {
        throw new Error('Invalid API response format');
      }

      return data.result.songs.map(song => ({
        id: song.id,
        title: song.name,
        artist: song.ar ? song.ar.map(a => a.name).join(', ') : song.artists?.map(a => a.name).join(', '),
        duration: Math.floor((song.dt || song.duration) / 1000),
        album: song.al?.name || song.album?.name,
        cover: song.al?.picUrl || song.album?.picUrl
      }));
    } catch (error) {
      console.error('Error searching songs via API:', error);
      throw error;
    }
  }

  async searchSongsViaSource(keyword) {
    try {
      const data = await this.fetchWithHeaders(
        `${this.sourceUrl}/search?keywords=${encodeURIComponent(keyword)}`
      );

      if (!data.data) {
        throw new Error('Invalid source response format');
      }

      return data.data.map(song => ({
        id: song.id,
        title: song.name,
        artist: song.artist,
        duration: Math.floor(song.duration),
        album: song.album,
        cover: song.cover
      }));
    } catch (error) {
      console.error('Error searching songs via source:', error);
      throw error;
    }
  }

  async getPlayUrl(id) {
    if (!id) {
      throw new Error('Song ID is required');
    }

    if (this.sourceType === 'api') {
      if (!this.apiEndpoint) {
        throw new Error('API endpoint is not configured');
      }
      return this.getPlayUrlViaApi(id);
    } else {
      if (!this.sourceUrl) {
        throw new Error('Source URL is not configured');
      }
      return this.getPlayUrlViaSource(id);
    }
  }

  async getPlayUrlViaApi(id) {
    const qualities = [
      { level: 'exhigh', br: '999000' },
      { level: 'higher', br: '320000' },
      { level: 'standard', br: '128000' }
    ];

    let lastError = null;

    // 尝试新版API获取URL
    for (const quality of qualities) {
      try {
        const data = await this.fetchWithHeaders(
          this.buildApiUrl(`/song/url/v1?id=${id}&level=${quality.level}`)
        );

        if (data.data?.[0]?.url) {
          return this.processUrl(data.data[0].url);
        }
      } catch (error) {
        console.warn(`Failed to get URL with quality ${quality.level}:`, error);
        lastError = error;
      }
    }

    // 尝试旧版API获取URL
    for (const quality of qualities) {
      try {
        const data = await this.fetchWithHeaders(
          this.buildApiUrl(`/song/url?id=${id}&br=${quality.br}`)
        );

        if (data.data?.[0]?.url) {
          return this.processUrl(data.data[0].url);
        }
      } catch (error) {
        console.warn(`Failed to get URL with bitrate ${quality.br}:`, error);
        lastError = error;
      }
    }

    // 尝试获取原始音源URL
    try {
      const data = await this.fetchWithHeaders(
        this.buildApiUrl(`/song/detail?ids=${id}`)
      );

      if (data.songs?.[0]?.mp3Url) {
        return this.processUrl(data.songs[0].mp3Url);
      }
    } catch (error) {
      console.warn('Failed to get original source URL:', error);
      lastError = error;
    }

    // 如果所有尝试都失败，抛出最后一个错误
    throw new Error(`Failed to get playable URL: ${lastError?.message || 'Unknown error'}`);
  }

  // 处理URL，确保是完整的可访问链接
  processUrl(url) {
    if (!url) return null;

    // 如果是相对路径，添加域名
    if (url.startsWith('/')) {
      return `https://music.163.com${url}`;
    }

    // 如果是特殊的 m7 或 m8 链接，替换为 m701 或 m801
    if (url.includes('://m7.')) {
      url = url.replace('://m7.', '://m701.');
    } else if (url.includes('://m8.')) {
      url = url.replace('://m8.', '://m801.');
    }

    // 如果是 http 链接，转换为 https
    if (url.startsWith('http://')) {
      url = url.replace('http://', 'https://');
    }

    return url;
  }

  async getPlayUrlViaSource(id) {
    try {
      const data = await this.fetchWithHeaders(
        `${this.sourceUrl}/url?id=${id}`
      );

      if (!data.data || !data.data.url) {
        throw new Error('Invalid URL response format');
      }

      return data.data.url;
    } catch (error) {
      console.error('Error getting song URL via source:', error);
      throw error;
    }
  }

  async getLyric(id) {
    if (!id) {
      throw new Error('Song ID is required');
    }

    if (this.sourceType === 'api') {
      if (!this.apiEndpoint) {
        throw new Error('API endpoint is not configured');
      }
      return this.getLyricViaApi(id);
    } else {
      if (!this.sourceUrl) {
        throw new Error('Source URL is not configured');
      }
      return this.getLyricViaSource(id);
    }
  }

  async getLyricViaApi(id) {
    try {
      const data = await this.fetchWithHeaders(
        this.buildApiUrl(`/lyric?id=${id}`)
      );

      if (!data.lrc) {
        return { lrc: '', tlyric: '' };
      }

      return {
        lrc: data.lrc?.lyric || '',
        tlyric: data.tlyric?.lyric || ''
      };
    } catch (error) {
      console.error('Error getting lyrics via API:', error);
      throw error;
    }
  }

  async getLyricViaSource(id) {
    try {
      const data = await this.fetchWithHeaders(
        `${this.sourceUrl}/lyric?id=${id}`
      );

      if (!data.data) {
        return { lrc: '', tlyric: '' };
      }

      return {
        lrc: data.data.lyric || '',
        tlyric: data.data.tlyric || ''
      };
    } catch (error) {
      console.error('Error getting lyrics via source:', error);
      throw error;
    }
  }

  async getFallbackUrl(id) {
    try {
      // 尝试使用备用API获取URL
      const data = await this.fetchWithHeaders(
        this.buildApiUrl(`/song/url?id=${id}&br=128000`)
      );

      if (!data.data?.[0]?.url) {
        return null;
      }

      return this.processUrl(data.data[0].url);
    } catch (error) {
      console.error('Error getting fallback URL:', error);
      return null;
    }
  }
} 