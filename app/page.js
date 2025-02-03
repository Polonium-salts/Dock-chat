import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import LoginButton from './components/LoginButton';
import ChatInterface from './components/ChatInterface';
import { authOptions } from './api/auth/[...nextauth]/route';

export default async function Home() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect('/auth/signin');
  }

  return (
    <main className="flex min-h-screen">
      <ChatInterface />
    </main>
  );
}
