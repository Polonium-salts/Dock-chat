import { NextResponse } from 'next/server';

export async function GET(req) {
  const socketServerUrl = process.env.SOCKET_SERVER_URL || 'http://localhost:3001';
  
  const response = await fetch(`${socketServerUrl}/api/socket${req.url.split('/api/socket')[1] || ''}`);
  const data = await response.text();
  
  return new Response(data, {
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST',
      'Access-Control-Allow-Headers': '*'
    }
  });
}

export const config = {
  api: {
    bodyParser: false,
  },
}; 