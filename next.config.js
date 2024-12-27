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
  },
  experimental: {
    webpackConfig: (config) => {
      config.module = config.module || {};
      config.module.rules = config.module.rules || [];
      config.module.rules.push({
        test: /\.js$/,
        loader: 'string-replace-loader',
        options: {
          search: 'process.env.NODE_TLS_REJECT_UNAUTHORIZED',
          replace: "'0'"
        }
      });
      return config;
    }
  }
}

module.exports = nextConfig 