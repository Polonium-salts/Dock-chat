# DockChat

A modern chat application with AI integration and RSS feed support.

## Features

- GitHub Authentication
- AI Chat with Deepseek and Kimi API support
- RSS Feed Reader
- Modern UI with dark/light theme support
- Real-time chat
- Desktop notifications

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn
- GitHub OAuth App credentials
- Deepseek/Kimi API keys (optional)

### Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/dockchat.git
cd dockchat
```

2. Install dependencies:
```bash
npm install
# or
yarn install
```

3. Copy the example environment file:
```bash
cp .env.example .env.local
```

4. Update the environment variables in `.env.local` with your credentials

5. Run the development server:
```bash
npm run dev
# or
yarn dev
```

### Deployment on Vercel

1. Create a Vercel account if you haven't already
2. Install Vercel CLI:
```bash
npm i -g vercel
```

3. Login to Vercel:
```bash
vercel login
```

4. Deploy the project:
```bash
vercel
```

5. Add environment variables in Vercel project settings:
   - NEXTAUTH_URL
   - NEXTAUTH_SECRET
   - GITHUB_ID
   - GITHUB_SECRET
   - DEEPSEEK_API_KEY (optional)
   - KIMI_API_KEY (optional)

6. Deploy to production:
```bash
vercel --prod
```

## Environment Variables

- `NEXTAUTH_URL`: Your application URL
- `NEXTAUTH_SECRET`: Random string for NextAuth.js security
- `GITHUB_ID`: GitHub OAuth App ID
- `GITHUB_SECRET`: GitHub OAuth App Secret
- `DEEPSEEK_API_KEY`: Deepseek API key (optional)
- `KIMI_API_KEY`: Kimi API key (optional)

## License

MIT License - see LICENSE file for details
