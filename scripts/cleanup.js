const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

/**
 * Script to terminate any running instances of the application before building
 * This helps prevent the EBUSY: resource busy or locked errors
 */
console.log('===== PRE-BUILD CLEANUP =====');

// Try to kill any running app processes
try {
  // On Windows, use taskkill to terminate processes
  if (process.platform === 'win32') {
    console.log('Terminating any running app instances...');
    try {
      execSync('taskkill /F /IM RusEcho-Portable.exe 2>nul');
      console.log('- RusEcho-Portable.exe terminated');
    } catch (e) {
      console.log('- No RusEcho-Portable.exe processes found');
    }
    
    try {
      execSync('taskkill /F /IM RusEcho.exe 2>nul');
      console.log('- RusEcho.exe processes terminated');
    } catch (e) {
      console.log('- No RusEcho.exe processes found');
    }
  } else {
    // On macOS/Linux, use pkill (would need to adjust process names)
    console.log('Non-Windows OS detected - process termination skipped');
  }

  // Add a small delay to ensure file handles are released
  console.log('Waiting for file handles to be released...');
  setTimeout(() => {
    // Check if we need to delete the locked file manually
    const exePath = path.join(__dirname, '..', 'electron-build-fresh', 'RusEcho-Portable.exe');
    
    if (fs.existsSync(exePath)) {
      try {
        fs.accessSync(exePath, fs.constants.W_OK);
        console.log(`- File ${exePath} is accessible and not locked`);
      } catch (e) {
        console.log(`- Note: ${exePath} may still be locked by the system`);
        console.log('- Builds may still fail if files cannot be overwritten');
      }
    }
    
    console.log('Cleanup complete!');
  }, 1000);
} catch (error) {
  console.error('Error during cleanup:', error);
}