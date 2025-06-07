#!/usr/bin/env node

// Production Build Optimization Script
// This script creates highly optimized builds for distribution

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const BUILD_CONFIG = {
  production: {
    minify: 'terser',
    sourcemap: false,
    cssMinify: true,
    treeshaking: true,
    optimization: 'maximum'
  },
  installer: {
    compression: 'maximum',
    oneClick: false,
    createDesktopShortcut: true,
    createStartMenuShortcut: true
  }
};

console.log('🏗️  Starting optimized production build...');
const startTime = Date.now();

try {
  // Step 1: Clean previous builds
  console.log('🧹 Cleaning previous builds...');
  execSync('npm run clean', { stdio: 'inherit' });
  
  // Step 2: Run startup optimizations
  console.log('⚡ Running startup optimizations...');
  execSync('npm run optimize-startup', { stdio: 'inherit' });
  
  // Step 3: Build the Vite app with maximum optimization
  console.log('📦 Building optimized Vite bundle...');
  execSync('cross-env NODE_ENV=production vite build --minify=terser --mode=production', { 
    stdio: 'inherit',
    env: {
      ...process.env,
      VITE_BUILD_OPTIMIZE: 'true',
      VITE_DISABLE_SOURCEMAP: 'true'
    }
  });
  
  // Step 4: Build Electron installer
  console.log('🔧 Creating Electron installer...');
  execSync('electron-builder --publish=never --config.compression=maximum', { 
    stdio: 'inherit' 
  });
  
  // Step 5: Create portable version
  console.log('💾 Creating portable version...');
  execSync('electron-builder --config.target=portable --publish=never', { 
    stdio: 'inherit' 
  });
  
  const buildTime = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`✅ Build completed successfully in ${buildTime}s`);
  
  // Display build artifacts
  console.log('\n📋 Build Artifacts:');
  const distPath = path.join(__dirname, '..', 'electron-dist');
  if (fs.existsSync(distPath)) {
    const files = fs.readdirSync(distPath);
    files.forEach(file => {
      const filePath = path.join(distPath, file);
      const stats = fs.statSync(filePath);
      const sizeMB = (stats.size / 1024 / 1024).toFixed(1);
      console.log(`  📄 ${file} (${sizeMB} MB)`);
    });
  }
  
  console.log('\n🎉 Ready for distribution!');
  
} catch (error) {
  console.error('❌ Build failed:', error.message);
  process.exit(1);
}
