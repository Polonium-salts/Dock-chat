/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@octokit/rest'],
  images: {
    domains: ['avatars.githubusercontent.com'],
  },
}

module.exports = nextConfig 