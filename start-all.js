const { spawn } = require('child_process');
const path = require('path');

console.log("Starting Backend Server...");
const backend = spawn('npm', ['run', 'start'], { 
  cwd: path.join(__dirname, 'backend'), 
  stdio: 'inherit',
  shell: true 
});

console.log("Starting Frontend Client...");
const frontend = spawn('npm', ['run', 'dev'], { 
  cwd: path.join(__dirname, 'frontend'), 
  stdio: 'inherit',
  shell: true 
});

process.on('SIGINT', () => {
  backend.kill('SIGINT');
  frontend.kill('SIGINT');
  process.exit();
});
