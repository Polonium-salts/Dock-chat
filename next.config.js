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
}

module.exports = nextConfig 