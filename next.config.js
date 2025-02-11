/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ['avatars.githubusercontent.com'],
  },
  async redirects() {
    return [
      {
        source: '/auth',
        destination: '/auth/signin',
        permanent: true,
      },
    ];
  },
  webpack: (config) => {
    config.externals.push({
      'utf-8-validate': 'commonjs utf-8-validate',
      'bufferutil': 'commonjs bufferutil',
    });
    return config;
  },
  async rewrites() {
    return [
      {
        source: '/api/socket/:path*',
        destination: 'http://localhost:3001/api/socket/:path*',
        basePath: false,
      },
    ];
  },
  experimental: {
    serverActions: true,
  },
  webSocketConfig: {
    path: '/api/socket',
    timeout: 45000,
  },
}

module.exports = nextConfig 