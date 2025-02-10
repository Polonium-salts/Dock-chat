/** @type {import('next').NextConfig} */
const nextConfig = {
  // 启用样式优化
  optimizeFonts: true,
  // 确保在生产环境中正确加载样式
  poweredByHeader: false,
  reactStrictMode: true,
  swcMinify: true,
  
  // 图片优化配置
  images: {
    deviceSizes: [320, 420, 768, 1024, 1200],
    imageSizes: [16, 32, 48, 64, 96, 128, 256],
    domains: [], // 添加允许的图片域名
    path: '/_next/image',
    loader: 'default',
    minimumCacheTTL: 60,
  },

  // 实验性功能
  experimental: {
    optimizeCss: true, // 启用 CSS 优化
    scrollRestoration: true, // 启用滚动位置恢复
  },

  // 性能优化
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production', // 生产环境移除 console
  },

  // PWA 支持
  pwa: {
    dest: 'public',
    disable: process.env.NODE_ENV === 'development',
  },
}

export default nextConfig;
