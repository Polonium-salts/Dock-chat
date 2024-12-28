import { EventEmitter } from 'events'

/**
 * 扩展上下文类
 */
export class ExtensionContext {
  constructor(roomId, socket, user) {
    this.roomId = roomId
    this.socket = socket
    this.user = user
    this.events = new EventEmitter()
  }

  sendMessage(message) {
    this.socket.emit('message', {
      roomId: this.roomId,
      ...message
    })
  }

  on(event, handler) {
    this.events.on(event, handler)
  }

  off(event, handler) {
    this.events.off(event, handler)
  }

  emit(event, data) {
    this.events.emit(event, data)
  }

  getCurrentUser() {
    return this.user
  }

  getRoomId() {
    return this.roomId
  }

  getSocket() {
    return this.socket
  }
}

/**
 * 扩展基类
 */
export class ChatRoomExtension {
  constructor(config) {
    this.id = config.id
    this.name = config.name
    this.version = config.version
    this.author = config.author
    this.description = config.description
    this.type = config.type
    this.config = config.config || {}
    
    this.messageHandler = null
    this.renderHandler = null
    this.initHandler = null
    this.destroyHandler = null
    this.components = new Map()
    this.data = new Map()
    this.context = null
  }

  onMessage(handler) {
    this.messageHandler = handler
  }

  onRender(handler) {
    this.renderHandler = handler
  }

  onInit(handler) {
    this.initHandler = handler
  }

  onDestroy(handler) {
    this.destroyHandler = handler
  }

  registerComponent(name, component) {
    this.components.set(name, component)
  }

  getMetadata() {
    return {
      id: this.id,
      name: this.name,
      version: this.version,
      author: this.author,
      description: this.description,
      type: this.type
    }
  }

  getConfig() {
    return this.config
  }

  updateConfig(newConfig) {
    this.config = {
      ...this.config,
      ...newConfig
    }
  }

  setData(key, value) {
    this.data.set(key, value)
  }

  getData(key) {
    return this.data.get(key)
  }

  sendMessage(message) {
    if (this.context) {
      this.context.sendMessage({
        extensionId: this.id,
        ...message
      })
    }
  }

  render(props) {
    if (this.renderHandler) {
      return this.renderHandler(props)
    }
    return null
  }

  initialize(context) {
    this.context = context
    if (this.initHandler) {
      this.initHandler(context)
    }
  }

  destroy() {
    if (this.destroyHandler) {
      this.destroyHandler()
    }
    this.context = null
    this.data.clear()
    this.components.clear()
  }

  handleMessage(message) {
    if (this.messageHandler) {
      this.messageHandler(message)
    }
  }
}

/**
 * 扩展管理器
 */
class ExtensionManager {
  constructor() {
    this.extensions = new Map()
  }

  register(extension) {
    if (this.extensions.has(extension.id)) {
      throw new Error(`Extension with id ${extension.id} already exists`)
    }
    this.extensions.set(extension.id, extension)
  }

  unregister(extensionId) {
    const extension = this.extensions.get(extensionId)
    if (extension) {
      extension.destroy()
      this.extensions.delete(extensionId)
    }
  }

  getExtension(extensionId) {
    return this.extensions.get(extensionId)
  }

  getAllExtensions() {
    return Array.from(this.extensions.values())
  }

  initializeAll(context) {
    for (const extension of this.extensions.values()) {
      extension.initialize(context)
    }
  }

  destroyAll() {
    for (const extension of this.extensions.values()) {
      extension.destroy()
    }
    this.extensions.clear()
  }
}

export const extensionManager = new ExtensionManager() 