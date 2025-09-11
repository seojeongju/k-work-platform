#!/usr/bin/env node

/**
 * Local Development Setup Script
 * 로컬 개발 환경을 설정하고 검증하는 스크립트
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 Setting up local development environment...\n');

// 1. Check Node.js version
console.log('1. Checking Node.js version...');
try {
  const nodeVersion = execSync('node --version', { encoding: 'utf8' }).trim();
  console.log(`   ✅ Node.js version: ${nodeVersion}`);
  
  const majorVersion = parseInt(nodeVersion.replace('v', '').split('.')[0]);
  if (majorVersion < 18) {
    console.log('   ⚠️  Warning: Node.js 18+ recommended for best compatibility');
  }
} catch (error) {
  console.log('   ❌ Node.js not found');
  process.exit(1);
}

// 2. Check dependencies
console.log('\n2. Checking dependencies...');
try {
  if (!fs.existsSync('node_modules')) {
    console.log('   📦 Installing dependencies...');
    execSync('npm ci', { stdio: 'inherit' });
  }
  console.log('   ✅ Dependencies are ready');
} catch (error) {
  console.log('   ❌ Failed to install dependencies');
  process.exit(1);
}

// 3. Check polyfills
console.log('\n3. Checking polyfills...');
try {
  if (fs.existsSync('setup-polyfills.cjs')) {
    execSync('node --require ./setup-polyfills.cjs -e "console.log(\'   ✅ Polyfills working\')"', { stdio: 'inherit' });
  } else {
    console.log('   ❌ Polyfills file not found');
    process.exit(1);
  }
} catch (error) {
  console.log('   ❌ Polyfills test failed');
  process.exit(1);
}

// 4. Test build
console.log('\n4. Testing build process...');
try {
  execSync('npm run build', { stdio: 'inherit' });
  
  if (fs.existsSync('dist/_worker.js')) {
    console.log('   ✅ Build test successful - Hono worker created');
    const stats = fs.statSync('dist/_worker.js');
    console.log(`   📊 Worker size: ${Math.round(stats.size / 1024)}KB`);
  } else {
    console.log('   ❌ Build test failed - no _worker.js found');
    process.exit(1);
  }
} catch (error) {
  console.log('   ❌ Build test failed');
  process.exit(1);
}

// 5. Check database setup
console.log('\n5. Checking database setup...');
try {
  if (fs.existsSync('.wrangler/state/v3/d1')) {
    console.log('   ✅ Local D1 database found');
  } else {
    console.log('   📦 Setting up local database...');
    execSync('npm run db:reset', { stdio: 'inherit' });
    console.log('   ✅ Local database initialized');
  }
} catch (error) {
  console.log('   ⚠️  Database setup skipped (will be available when needed)');
}

// 6. Show available commands
console.log('\n🎉 Local development environment is ready!\n');
console.log('📋 Available commands:');
console.log('   npm run dev          - Start Vite development server (port 5173)');
console.log('   npm run dev:build    - Build and preview');
console.log('   npm run dev:sandbox  - Start Cloudflare Pages dev server (port 3000)');
console.log('   npm run dev:full     - Build and start sandbox server');
console.log('   npm run build        - Build for production');
console.log('   npm run deploy       - Deploy to Cloudflare Pages');
console.log('\n🔧 Database commands:');
console.log('   npm run db:reset     - Reset and seed local database');
console.log('   npm run db:migrate:local - Apply migrations to local database');
console.log('   npm run db:console:local - Open local database console');
console.log('\n🌐 Access URLs:');
console.log('   Development: http://localhost:5173');
console.log('   Sandbox:     http://localhost:3000');
console.log('   Production:  https://w-campus.pages.dev (after deploy)');
console.log('\n💡 Note: Custom domain w-campus.com will be configured later');