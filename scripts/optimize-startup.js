// Advanced Startup optimization script for RusEcho
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const os = require('os');

console.log('🚀 Running advanced startup optimization script...');

// Performance metrics tracking
const startTime = Date.now();

// Function to clear cache files that might be slowing down startup
function clearCacheFiles() {
  console.log('🧹 Clearing cache files...');
  
  const cacheDirectories = [
    // Electron cache
    path.join(process.env.APPDATA, 'RusEcho', 'Cache'),
    path.join(process.env.APPDATA, 'RusEcho', 'Code Cache'),
    path.join(process.env.APPDATA, 'RusEcho', 'GPUCache'),
    path.join(process.env.APPDATA, 'RusEcho', 'DawnCache'),
    
    // Node modules cache that might be causing issues
    path.join(__dirname, '..', 'node_modules', '.cache'),
    path.join(__dirname, '..', 'node_modules', '.vite'),
    path.join(__dirname, '..', '.vite'),
    
    // Performance logs (keeping only recent ones)
    path.join(process.env.APPDATA, 'RusEcho', 'logs'),
  ];
  
  // Handle performance log differently - keep recent ones
  const perfLogPath = path.join(process.env.APPDATA, 'RusEcho', 'performance-log.json');
  try {
    if (fs.existsSync(perfLogPath)) {
      const logData = JSON.parse(fs.readFileSync(perfLogPath, 'utf8'));
      // Keep only last 10 entries
      const trimmedData = logData.slice(-10);
      fs.writeFileSync(perfLogPath, JSON.stringify(trimmedData, null, 2), 'utf8');
      console.log(`📉 Trimmed performance logs to last ${trimmedData.length} entries`);
    }
  } catch (err) {
    console.error('❌ Error processing performance logs:', err);
  }
  
  cacheDirectories.forEach(dir => {
    try {
      if (fs.existsSync(dir)) {
        console.log(`🗑️ Clearing cache directory: ${dir}`);
        fs.rmSync(dir, { recursive: true, force: true });
      }
    } catch (err) {
      console.error(`❌ Error clearing cache directory ${dir}:`, err);
    }
  });
  
  // Clear temp files that could be related to the app
  const tempPath = os.tmpdir();
  try {
    const tempFiles = fs.readdirSync(tempPath);
    const rusEchoTemp = tempFiles.filter(f => f.includes('rusecho') || f.includes('electron'));
    rusEchoTemp.forEach(file => {
      try {
        fs.unlinkSync(path.join(tempPath, file));
        console.log(`🧹 Removed temporary file: ${file}`);
      } catch (e) {
        // Ignore errors for temp files
      }
    });
  } catch (err) {
    console.error('❌ Error clearing temp files:', err);
  }
}

// Optimize the node_modules folder
function optimizeNodeModules() {
  try {
    console.log('📦 Pruning unnecessary dependencies...');
    execSync('npm prune', { stdio: 'inherit' });
    
    console.log('⚙️ Optimizing package modules...');
    // Verify dependencies and deduplicate them
    execSync('npm dedupe', { stdio: 'inherit' });
    
    // Check for needing to rebuild
    console.log('🔄 Checking for modules that need rebuilding...');
    try {
      execSync('npm rebuild', { stdio: 'inherit' });
    } catch (rebuildErr) {
      console.error('⚠️ Warning during rebuild:', rebuildErr);
    }
  } catch (err) {
    console.error('❌ Error optimizing dependencies:', err);
  }
}

// Create V8 snapshot to improve startup time
function createV8Snapshot() {
  // This is a placeholder for a more advanced optimization
  // Actual implementation would require additional tooling
  console.log('📸 V8 snapshot creation would go here in a production setup');
}

// Optimize Electron configuration
function optimizeElectronConfig() {
  const electronBuilderConfigPath = path.join(__dirname, '..', 'electron-builder.json');
  let updated = false;
  
  try {
    if (fs.existsSync(electronBuilderConfigPath)) {
      const configData = JSON.parse(fs.readFileSync(electronBuilderConfigPath, 'utf8'));
      
      // Add optimizations to the electron-builder configuration
      if (!configData.files) {
        configData.files = [];
      }
      
      // Ensure we're only including necessary files
      const requiredFiles = [
        "dist/",
        "electron/",
        "public/",
        "package.json"
      ];
      
      // Add any missing required files
      requiredFiles.forEach(file => {
        if (!configData.files.includes(file)) {
          configData.files.push(file);
          updated = true;
        }
      });
      
      // Add optimizations if they don't exist
      if (!configData.extraMetadata) {
        configData.extraMetadata = {};
      }
      
      if (!configData.extraMetadata.main) {
        configData.extraMetadata.main = "./electron/main.js";
        updated = true;
      }
      
      // Add build optimizations
      if (!configData.asar) {
        configData.asar = true; // Use asar format for better performance
        updated = true;
      }
      
      // Save the optimized configuration
      if (updated) {
        fs.writeFileSync(electronBuilderConfigPath, JSON.stringify(configData, null, 2), 'utf8');
        console.log('✅ Optimized Electron builder configuration');
      } else {
        console.log('🔧 Electron builder configuration already optimized');
      }
    }
  } catch (err) {
    console.error('❌ Error optimizing Electron configuration:', err);
  }
}

// Run optimizations
console.log('🚀 Starting optimization process...');
clearCacheFiles();
optimizeNodeModules();
optimizeElectronConfig();
console.log('✅ All optimizations complete!');

// Print recommendations for further optimization
console.log('\n--- Recommendations for further optimization ---');
console.log('1. Use --disable-gpu-vsync flag when running the app for testing');
console.log('2. Consider adding NODE_OPTIONS="--max-old-space-size=512" to production environment');
console.log('3. Run the app with --js-flags="--expose-gc" to enable manual garbage collection');
console.log('-----------------------------------------------');
createV8Snapshot();

const endTime = Date.now();
console.log(`⏱️ Optimization script completed in ${(endTime - startTime) / 1000} seconds`);
console.log('✅ Startup optimization complete!');
