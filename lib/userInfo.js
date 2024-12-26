export async function generateLoginMessage(session) {
  try {
    // 获取用户 IP 信息
    const ipResponse = await fetch('https://api.ipify.org?format=json')
    const ipData = await ipResponse.json()
    const userIP = ipData.ip

    // 获取地理位置信息
    const geoResponse = await fetch(`https://ipapi.co/${userIP}/json/`)
    const geoData = await geoResponse.json()
    
    // 获取设备信息
    const userAgent = window.navigator.userAgent
    const platform = window.navigator.platform
    
    // 格式化时间
    const loginTime = new Date().toLocaleString('zh-CN', {
      timeZone: 'Asia/Shanghai',
      hour12: false
    })

    // 构建登录信息消息
    const loginMessage = `系统通知：用户 ${session.user.name} 已登录
• 登录时间：${loginTime}
• IP 地址：${userIP}
• 位置信息：${geoData.city}, ${geoData.region}, ${geoData.country_name}
• 登录设备：${platform}
• 浏览器信息：${userAgent}`

    return loginMessage
  } catch (error) {
    console.error('Error generating login message:', error)
    // 返回一个基础的登录消息
    return `系统通知：用户 ${session.user.name} 已登录
• 登录时间：${new Date().toLocaleString('zh-CN', { hour12: false })}`
  }
} 