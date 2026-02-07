// server.js - Azure App Service entry point for Next.js
// This file is detected by Azure's Oryx build system and PM2

const { spawn } = require('child_process');

const port = process.env.PORT || 3000;

console.log(`Starting Next.js on port ${port}...`);

// Start Next.js production server
const next = spawn('npx', ['next', 'start', '-p', port.toString()], {
  stdio: 'inherit',
  shell: true
});

next.on('error', (err) => {
  console.error('Failed to start Next.js:', err);
  process.exit(1);
});

next.on('close', (code) => {
  console.log(`Next.js process exited with code ${code}`);
  process.exit(code);
});
