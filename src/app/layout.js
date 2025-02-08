import './globals.css';

export const metadata = {
  title: '在线聊天室',
  description: '基于Next.js和Socket.IO的实时聊天应用',
};

export default function RootLayout({ children }) {
  return (
    <html lang="zh">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
