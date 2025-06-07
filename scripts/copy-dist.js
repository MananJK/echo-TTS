const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Paths
const buildDir = path.join(__dirname, '..', 'electron-build-fresh', 'win-unpacked');
const resourcesDir = path.join(buildDir, 'resources');
const appDir = path.join(resourcesDir, 'app');
const distDir = path.join(__dirname, '..', 'dist');
const targetDistDir = path.join(appDir, 'dist');

console.log('===== DIST COPY SCRIPT =====');

// Make sure all directories exist
function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    console.log(`Creating directory: ${dir}`);
    fs.mkdirSync(dir, { recursive: true });
  }
}

// Copy directory recursively
function copyDir(src, dest) {
  ensureDir(dest);

  const entries = fs.readdirSync(src, { withFileTypes: true });

  for (let entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
      console.log(`Copied: ${srcPath} -> ${destPath}`);
    }
  }
}

// Direct copy of dist folder to resources/app/dist
try {
  console.log(`Copying dist files from ${distDir} to ${targetDistDir}`);
  ensureDir(appDir);
  copyDir(distDir, targetDistDir);
  console.log('Dist files copied successfully!');
  
  // Also copy to resources/dist as a fallback
  const resourcesDistDir = path.join(resourcesDir, 'dist');
  console.log(`Copying dist files from ${distDir} to ${resourcesDistDir} (fallback)`);
  copyDir(distDir, resourcesDistDir);
  console.log('Fallback dist files copied successfully!');

  console.log('===== COPY COMPLETE =====');
} catch (error) {
  console.error('Error copying dist files:', error);
  process.exit(1);
}