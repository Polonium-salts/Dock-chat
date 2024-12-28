import { ChatRoomExtension } from '../extensionApi'
import { useState, useEffect } from 'react'
import { extensionManager } from '../extensionApi'
import SyntaxHighlighter from 'react-syntax-highlighter'
import { vscDarkPlus } from 'react-syntax-highlighter/dist/cjs/styles/prism'

export class CodeCollabExtension extends ChatRoomExtension {
  constructor() {
    super({
      id: 'code-collab',
      name: '代码协作',
      version: '1.0.0',
      author: 'Dock Chat',
      description: '支持实时代码协作的扩展',
      type: 'code_collaboration',
      config: {
        enableSyntaxHighlight: true,
        enableLiveCollab: true,
        defaultLanguage: 'javascript'
      }
    })

    this.onMessage(this.handleMessage.bind(this))
    this.onRender(this.renderUI.bind(this))
    this.registerComponent('CodeEditor', CodeEditorWrapper)
  }

  handleMessage(message) {
    if (message.type === 'code') {
      // 处理代码消息
      console.log('Received code message:', message)
    }
  }

  sendCode(code, language) {
    this.sendMessage({
      type: 'code',
      code,
      language,
      timestamp: new Date().toISOString()
    })
  }

  renderUI({ message, currentUser }) {
    if (message.type !== 'code') return null

    return (
      <CodeMessage
        message={message}
        currentUser={currentUser}
        config={this.config}
      />
    )
  }
}

const CodeEditorWrapper = ({ onClose }) => {
  const extension = extensionManager.getExtension('code-collab')
  const [code, setCode] = useState('')
  const [language, setLanguage] = useState(extension.config.defaultLanguage)

  const handleSubmit = () => {
    if (code.trim()) {
      extension.sendCode(code, language)
      onClose()
    }
  }

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-medium">分享代码</h3>
        <button
          onClick={onClose}
          className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
        >
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>
      <div className="mb-4">
        <select
          value={language}
          onChange={(e) => setLanguage(e.target.value)}
          className="w-full p-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="javascript">JavaScript</option>
          <option value="python">Python</option>
          <option value="java">Java</option>
          <option value="cpp">C++</option>
          <option value="csharp">C#</option>
          <option value="php">PHP</option>
          <option value="ruby">Ruby</option>
          <option value="swift">Swift</option>
          <option value="go">Go</option>
          <option value="rust">Rust</option>
        </select>
      </div>
      <div className="mb-4">
        <textarea
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="在此输入代码..."
          className="w-full h-64 p-4 font-mono text-sm border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
      <button
        onClick={handleSubmit}
        disabled={!code.trim()}
        className="w-full py-2 px-4 text-white bg-blue-500 rounded-lg hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
      >
        分享代码
      </button>
    </div>
  )
}

const CodeMessage = ({ message, currentUser, config }) => {
  const isOwner = message.sender.id === currentUser.id

  return (
    <div className={`flex ${isOwner ? 'justify-end' : 'justify-start'} mb-4`}>
      <div className={`max-w-2xl rounded-lg overflow-hidden ${
        isOwner ? 'bg-blue-500' : 'bg-gray-100 dark:bg-gray-700'
      }`}>
        <div className="flex items-center justify-between p-2 bg-black/10">
          <div className="flex items-center gap-2">
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"
              />
            </svg>
            <span className="text-sm font-medium">
              {message.language}
            </span>
          </div>
          <button
            onClick={() => {
              navigator.clipboard.writeText(message.code)
            }}
            className="p-1 hover:bg-black/10 rounded"
            title="复制代码"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
              />
            </svg>
          </button>
        </div>
        <div className="p-4">
          <SyntaxHighlighter
            language={message.language}
            style={vscDarkPlus}
            customStyle={{
              margin: 0,
              borderRadius: '0.5rem'
            }}
          >
            {message.code}
          </SyntaxHighlighter>
        </div>
      </div>
    </div>
  )
} 