/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@octokit/rest'],
  images: {
    domains: ['avatars.githubusercontent.com'],
  },
  async rewrites() {
    return [
      {
        source: '/:username',
        destination: '/',
      },
      {
        source: '/:username/:path*',
        destination: '/:path*',
      }
    ]
  }
}

module.exports = nextConfig 