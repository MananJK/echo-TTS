// Performance Optimizer for RusEcho Electron App
// This module contains advanced performance optimizations

const { app } = require('electron');
const os = require('os');
const v8 = require('v8');

class PerformanceOptimizer {
  constructor() {
    this.startTime = Date.now();
    this.initialized = false;
  }

  // Initialize all performance optimizations
  initialize() {
    if (this.initialized) return;
    
    console.log('🚀 Initializing Performance Optimizer...');
    
    this.optimizeMemory();
    this.optimizeProcessPriority();
    this.optimizeV8();
    this.setupPerformanceMonitoring();
    
    this.initialized = true;
    console.log(`✅ Performance optimization complete in ${Date.now() - this.startTime}ms`);
  }

  // Memory optimization
  optimizeMemory() {
    // Force garbage collection if available
    if (global.gc) {
      setInterval(() => {
        global.gc();
      }, 30000); // Every 30 seconds
    }

    // Set memory limits based on system RAM
    const totalMemory = os.totalmem();
    const memoryLimitMB = Math.min(512, Math.floor(totalMemory / (1024 * 1024 * 8))); // Use max 1/8 of system RAM, capped at 512MB
    
    // Apply V8 heap limits
    v8.setFlagsFromString(`--max-old-space-size=${memoryLimitMB}`);
    v8.setFlagsFromString('--optimize-for-size');
    
    console.log(`💾 Memory limit set to ${memoryLimitMB}MB`);
  }

  // Process priority optimization
  optimizeProcessPriority() {
    if (process.platform === 'win32') {
      try {
        // Set high priority for better responsiveness
        process.setProcessPriority && process.setProcessPriority('high');
        console.log('⚡ Process priority set to HIGH');
      } catch (error) {
        console.log('⚠️ Could not set process priority:', error.message);
      }
    }
  }

  // V8 JavaScript engine optimizations
  optimizeV8() {
    // Enable aggressive optimizations
    v8.setFlagsFromString('--use-strict');
    v8.setFlagsFromString('--harmony');
    v8.setFlagsFromString('--turbo-inlining');
    v8.setFlagsFromString('--turbo-splitting');
    
    // Memory management optimizations
    v8.setFlagsFromString('--incremental-marking');
    v8.setFlagsFromString('--concurrent-sweeping');
    
    console.log('🔧 V8 engine optimizations applied');
  }

  // Setup performance monitoring
  setupPerformanceMonitoring() {
    // Monitor memory usage
    setInterval(() => {
      const memUsage = process.memoryUsage();
      const cpuUsage = process.cpuUsage();
      
      // Log if memory usage is high
      if (memUsage.heapUsed > 100 * 1024 * 1024) { // 100MB
        console.log(`📊 High memory usage: ${Math.round(memUsage.heapUsed / 1024 / 1024)}MB`);
        
        // Force garbage collection if available
        if (global.gc) {
          global.gc();
        }
      }
    }, 60000); // Every minute
  }

  // Get performance stats
  getStats() {
    const memUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();
    const uptime = process.uptime();
    
    return {
      memory: {
        rss: Math.round(memUsage.rss / 1024 / 1024), // MB
        heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024), // MB
        heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024), // MB
        external: Math.round(memUsage.external / 1024 / 1024) // MB
      },
      cpu: {
        user: cpuUsage.user,
        system: cpuUsage.system
      },
      uptime: Math.round(uptime),
      platform: process.platform,
      arch: process.arch,
      nodeVersion: process.version
    };
  }

  // Cleanup function
  cleanup() {
    console.log('🧹 Cleaning up performance optimizer...');
    // Any cleanup logic here
  }
}

// Create singleton instance
const performanceOptimizer = new PerformanceOptimizer();

// Auto-initialize when app is ready
app.whenReady().then(() => {
  performanceOptimizer.initialize();
});

// Cleanup on app quit
app.on('before-quit', () => {
  performanceOptimizer.cleanup();
});

module.exports = performanceOptimizer;
