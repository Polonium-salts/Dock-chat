let conversationHistory = []

export async function sendMessageToKimi(message, apiKey) {
  try {
    // 添加用户消息到历史记录
    conversationHistory.push({ role: 'user', content: message })

    // 保持历史记录在合理范围内（最近10条消息）
    if (conversationHistory.length > 10) {
      conversationHistory = conversationHistory.slice(-10)
    }

    const response = await fetch('https://api.moonshot.cn/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'moonshot-v1-8k',
        messages: conversationHistory,
        temperature: 0.7,
        max_tokens: 2000,
        presence_penalty: 0.6,
        frequency_penalty: 0.5
      })
    })

    if (!response.ok) {
      throw new Error(`API request failed: ${response.status}`)
    }

    const data = await response.json()
    const aiResponse = data.choices[0].message.content

    // 添加 AI 响应到历史记录
    conversationHistory.push({ role: 'assistant', content: aiResponse })

    return aiResponse
  } catch (error) {
    console.error('Error calling Kimi AI:', error)
    throw error
  }
}

// 清除对话历史
export function clearKimiConversation() {
  conversationHistory = []
}

// 获取当前对话历史
export function getKimiConversationHistory() {
  return conversationHistory
} 