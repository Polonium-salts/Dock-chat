import { NextResponse } from 'next/server';

export async function GET(req) {
  const socketServerUrl = process.env.SOCKET_SERVER_URL || 'http://localhost:3001';
  
  return NextResponse.rewrite(new URL('/api/socket', socketServerUrl));
}

export const config = {
  api: {
    bodyParser: false,
  },
}; 