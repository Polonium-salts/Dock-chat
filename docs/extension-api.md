# Dock Chat 扩展接口文档

## 简介

Dock Chat 扩展接口允许第三方开发者创建自定义聊天室类型，扩展聊天室的功能。通过这个接口，你可以：

- 创建自定义聊天室类型
- 添加自定义UI组件
- 处理自定义消息类型
- 实现特定的业务逻辑
- 存储和管理扩展数据

## 快速开始

### 1. 创建扩展

```javascript
import { ChatRoomExtension } from '@/lib/extensionApi'

// 创建扩展实例
const myExtension = new ChatRoomExtension({
  id: 'my-extension',
  name: '我的扩展',
  version: '1.0.0',
  author: '开发者名称',
  description: '扩展描述',
  type: 'custom',
  config: {
    // 扩展配置
  }
})

// 注册消息处理器
myExtension.onMessage((message) => {
  // 处理消息
})

// 注册渲染函数
myExtension.onRender((props) => {
  // 返回 React 组件
  return <MyCustomComponent {...props} />
})

// 注册初始化函数
myExtension.onInit((context) => {
  // 初始化逻辑
})

// 注册销毁函数
myExtension.onDestroy(() => {
  // 清理逻辑
})
```

### 2. 注册扩展

```javascript
import { extensionManager } from '@/lib/extensionApi'

// 注册扩展
extensionManager.register(myExtension)
```

## API 参考

### ChatRoomExtension

扩展的主类，用于创建新的扩展实例。

#### 构造函数

```javascript
new ChatRoomExtension(config: {
  id: string,          // 扩展唯一标识
  name: string,        // 扩展名称
  version: string,     // 扩展版本
  author: string,      // 扩展作者
  description: string, // 扩展描述
  type: string,        // 扩展类型
  config?: object      // 扩展配置
})
```

#### 方法

- `onMessage(handler: (message: object) => void)`：注册消息处理函数
- `onRender(handler: (props: object) => ReactNode)`：注册渲染函数
- `onInit(handler: (context: ExtensionContext) => void)`：注册初始化函数
- `onDestroy(handler: () => void)`：注册销毁函数
- `registerComponent(name: string, component: ReactComponent)`：注册自定义组件
- `getMetadata()`：获取扩展元数据
- `getConfig()`：获取扩展配置
- `updateConfig(newConfig: object)`：更新扩展配置
- `setData(key: string, value: any)`：存储数据
- `getData(key: string)`：获取数据
- `sendMessage(message: object)`：发送消息
- `render(props: object)`：渲染界面
- `initialize(context: ExtensionContext)`：初始化扩展
- `destroy()`：销毁扩展

### ExtensionContext

扩展上下文对象，提供扩展运行时的环境和工具。

#### 方法

- `sendMessage(message: object)`：发送消息
- `on(event: string, handler: Function)`：注册事件监听器
- `off(event: string, handler: Function)`：移除事件监听器
- `emit(event: string, data: any)`：触发事件
- `getCurrentUser()`：获取当前用户信息
- `getRoomId()`：获取房间ID
- `getSocket()`：获取Socket实例

### ExtensionManager

扩展管理器，用于管理所有已注册的扩展。

#### 方法

- `register(extension: ChatRoomExtension)`：注册扩展
- `unregister(extensionId: string)`：注销扩展
- `getExtension(extensionId: string)`：获取扩展实例
- `getAllExtensions()`：获取所有扩展
- `initializeAll(context: ExtensionContext)`：初始化所有扩展
- `destroyAll()`：销毁所有扩展

## 示例

### 1. 文件共享扩展

```javascript
import { ChatRoomExtension } from '@/lib/extensionApi'

class FileShareExtension extends ChatRoomExtension {
  constructor() {
    super({
      id: 'file-share',
      name: '文件共享',
      version: '1.0.0',
      author: 'Dock Chat',
      description: '支持文件上传和共享的扩展',
      type: 'file_sharing',
      config: {
        allowImages: true,
        allowDocuments: true,
        maxFileSize: 10 * 1024 * 1024 // 10MB
      }
    })

    this.onMessage(this.handleMessage.bind(this))
    this.onRender(this.renderUI.bind(this))
  }

  handleMessage(message) {
    if (message.type === 'file') {
      // 处理文件消息
    }
  }

  renderUI(props) {
    return <FileShareComponent {...props} />
  }
}
```

### 2. 代码协作扩展

```javascript
import { ChatRoomExtension } from '@/lib/extensionApi'

class CodeCollabExtension extends ChatRoomExtension {
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
        enableLiveCollab: true
      }
    })

    this.onInit(this.initialize.bind(this))
    this.onMessage(this.handleMessage.bind(this))
    this.onRender(this.renderUI.bind(this))
  }

  initialize(context) {
    // 初始化代码编辑器
  }

  handleMessage(message) {
    if (message.type === 'code') {
      // 处理代码更新
    }
  }

  renderUI(props) {
    return <CodeEditorComponent {...props} />
  }
}
```

## 最佳实践

1. **扩展命名**
   - 使用有意义的ID和名称
   - 版本号遵循语义化版本规范

2. **错误处��**
   - 妥善处理所有可能的错误情况
   - 提供用户友好的错误提示

3. **资源管理**
   - 在 `onDestroy` 中清理所有资源
   - 避免内存泄漏

4. **性能优化**
   - 避免不必要的渲染
   - 合理使用缓存
   - 优化大量数据的处理

5. **安全性**
   - 验证所有用户输入
   - 使用适当的权限控制
   - 保护敏感数据

## 注意事项

1. 扩展ID必须是唯一的
2. 扩展应该是独立的，不应该依赖其他扩展
3. 扩展应该处理自己的错误，不影响主应用
4. 扩展应该遵循主应用的主题和样式指南
5. 扩展应该支持热插拔，可以随时启用或禁用 