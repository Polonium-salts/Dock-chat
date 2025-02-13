const { spawn } = require('child_process');
const path = require('path');

// 启动 Next.js 开发服务器
const nextDev = spawn('npx', ['next', 'dev'], {
  stdio: 'inherit',
  shell: true
});

// 启动 Socket.IO 服务器
require('./server');

// 错误处理
nextDev.on('error', (err) => {
  console.error('Failed to start Next.js development server:', err);
  process.exit(1);
});

process.on('SIGTERM', () => {
  nextDev.kill();
  process.exit(0);
});

process.on('SIGINT', () => {
  nextDev.kill();
  process.exit(0);
}); 