# Telegraph Chat

A real-time chat application built with Next.js and GitHub authentication.

## Features

- Real-time messaging using Socket.IO
- GitHub authentication
- Modern and responsive UI
- Secure communication

## Environment Variables

Before running this project, you need to set up the following environment variables:

1. Create a GitHub OAuth application at https://github.com/settings/developers
   - Set Homepage URL to your domain (e.g., `https://your-domain.vercel.app`)
   - Set Authorization callback URL to `https://your-domain.vercel.app/api/auth/callback/github`

2. Copy `.env.example` to `.env` and fill in the values:
   ```bash
   cp .env.example .env
   ```

3. Required environment variables:
   - `GITHUB_ID`: Your GitHub OAuth Client ID
   - `GITHUB_SECRET`: Your GitHub OAuth Client Secret
   - `NEXTAUTH_URL`: Your application URL
   - `NEXTAUTH_SECRET`: A random string for session encryption

## Development

```bash
# Install dependencies
npm install

# Run the development server
npm run dev
```

## Deployment

1. Deploy to Vercel:
   - Connect your GitHub repository
   - Add environment variables in Vercel project settings
   - Deploy the project

2. Update GitHub OAuth application with production URLs

## Security

- Never commit `.env` files to version control
- Keep your environment variables secure
- Regularly rotate your secrets
