#!/usr/bin/env node

const { spawn } = require('child_process');

function hasDisplay() {
  return !!process.env.DISPLAY;
}

function canUseXvfb() {
  // Only relevant on Linux. On other platforms, xvfb-run is typically unavailable.
  return process.platform === 'linux' && !hasDisplay();
}

function main() {
  const argv = process.argv.slice(2);
  if (argv.length === 0) {
    console.error('Usage: node scripts/runWithXvfb.js <command> [args...]');
    process.exit(2);
  }

  const useXvfb = canUseXvfb();
  const command = useXvfb ? 'xvfb-run' : argv[0];
  const args = useXvfb ? ['-a', ...argv] : argv.slice(1);

  const child = spawn(command, args, {
    stdio: 'inherit',
    env: process.env,
  });

  child.on('exit', (code, signal) => {
    if (signal) {
      process.exit(1);
    }
    process.exit(code ?? 1);
  });
}

main();
