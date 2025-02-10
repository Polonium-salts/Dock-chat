export class AIChat {
  constructor(config) {
    this.config = config;
  }

  async chatWithDeepseek(message) {
    if (!this.config.deepseek.enabled || !this.config.deepseek.apiKey) {
      throw new Error('Deepseek API is not configured');
    }

    try {
      const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.config.deepseek.apiKey}`,
        },
        body: JSON.stringify({
          model: 'deepseek-chat',
          messages: [{ role: 'user', content: message }],
          temperature: 0.7,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to get response from Deepseek API');
      }

      const data = await response.json();
      return {
        content: data.choices[0].message.content,
        source: 'deepseek',
      };
    } catch (error) {
      console.error('Deepseek API error:', error);
      throw error;
    }
  }

  async chatWithKimi(message) {
    if (!this.config.kimi.enabled || !this.config.kimi.apiKey) {
      throw new Error('Kimi API is not configured');
    }

    try {
      const response = await fetch('https://api.moonshot.cn/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.config.kimi.apiKey}`,
        },
        body: JSON.stringify({
          model: 'moonshot-v1-8k',
          messages: [{ role: 'user', content: message }],
          temperature: 0.7,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to get response from Kimi API');
      }

      const data = await response.json();
      return {
        content: data.choices[0].message.content,
        source: 'kimi',
      };
    } catch (error) {
      console.error('Kimi API error:', error);
      throw error;
    }
  }

  async chat(message, preferredAI = 'auto') {
    if (preferredAI === 'deepseek' && this.config.deepseek.enabled) {
      return this.chatWithDeepseek(message);
    } else if (preferredAI === 'kimi' && this.config.kimi.enabled) {
      return this.chatWithKimi(message);
    } else {
      // Auto mode: try available AIs in order
      if (this.config.deepseek.enabled) {
        return this.chatWithDeepseek(message);
      } else if (this.config.kimi.enabled) {
        return this.chatWithKimi(message);
      } else {
        throw new Error('No AI service is configured');
      }
    }
  }
} 