import { NextResponse } from 'next/server'

export async function POST(request) {
  try {
    const { message, model, apiKey } = await request.json()

    // 根据不同的模型选择不同的API端点
    let apiEndpoint = ''
    let requestBody = {}
    let headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    }

    if (model.startsWith('gpt-')) {
      apiEndpoint = 'https://api.openai.com/v1/chat/completions'
      requestBody = {
        model,
        messages: [{ role: 'user', content: message }],
        temperature: 0.7,
        max_tokens: 2000
      }
    } else if (model === 'claude-2') {
      apiEndpoint = 'https://api.anthropic.com/v1/messages'
      requestBody = {
        model: 'claude-2',
        messages: [{ role: 'user', content: message }],
        max_tokens: 2000
      }
      headers = {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      }
    } else {
      throw new Error('Unsupported model')
    }

    const response = await fetch(apiEndpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify(requestBody)
    })

    if (!response.ok) {
      throw new Error('AI API request failed')
    }

    const data = await response.json()
    let content = ''

    if (model.startsWith('gpt-')) {
      content = data.choices[0].message.content
    } else if (model === 'claude-2') {
      content = data.content[0].text
    }

    return NextResponse.json({ content })
  } catch (error) {
    console.error('Error in AI chat:', error)
    return NextResponse.json(
      { error: 'Failed to get AI response' },
      { status: 500 }
    )
  }
} 