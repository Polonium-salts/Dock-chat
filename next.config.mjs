/** @type {import('next').NextConfig} */
const nextConfig = {
  // 启用样式优化
  optimizeFonts: true,
  // 确保在生产环境中正确加载样式
  poweredByHeader: false,
  reactStrictMode: true,
  swcMinify: true,
}

export default nextConfig;
