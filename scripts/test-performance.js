// Performance Test Script for RusEcho
// This script measures app startup time and performance metrics

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

class PerformanceTester {
  constructor() {
    this.results = [];
    this.startTime = null;
  }

  async testStartupTime(appPath) {
    console.log('🧪 Testing app startup performance...');
    
    return new Promise((resolve, reject) => {
      this.startTime = Date.now();
      
      const app = spawn(appPath, [], {
        stdio: 'pipe',
        env: { ...process.env, NODE_ENV: 'production' }
      });

      let appReady = false;
      let timeout;

      // Set timeout for startup
      timeout = setTimeout(() => {
        if (!appReady) {
          app.kill();
          reject(new Error('App startup timed out (30 seconds)'));
        }
      }, 30000);

      // Listen for app ready signal
      app.stdout.on('data', (data) => {
        const output = data.toString();
        console.log('App output:', output);
        
        // Look for app ready indicators
        if (output.includes('App rendered') || output.includes('ready-to-show')) {
          if (!appReady) {
            appReady = true;
            const startupTime = Date.now() - this.startTime;
            clearTimeout(timeout);
            
            console.log(`✅ App started in ${startupTime}ms`);
            
            // Give app a moment to fully load, then close it
            setTimeout(() => {
              app.kill();
              resolve(startupTime);
            }, 2000);
          }
        }
      });

      app.stderr.on('data', (data) => {
        console.log('App error:', data.toString());
      });

      app.on('error', (error) => {
        clearTimeout(timeout);
        reject(error);
      });

      app.on('close', (code) => {
        clearTimeout(timeout);
        if (!appReady) {
          reject(new Error(`App exited with code ${code} before ready`));
        }
      });
    });
  }

  async runPerformanceTests() {
    console.log('🚀 Starting RusEcho Performance Tests\n');

    const testResults = {
      timestamp: new Date().toISOString(),
      system: {
        platform: process.platform,
        arch: process.arch,
        nodeVersion: process.version,
        memory: Math.round(require('os').totalmem() / 1024 / 1024 / 1024) + 'GB'
      },
      tests: []
    };

    // Test different app versions
    const appPaths = [
      'electron-dist\\win-unpacked\\RusEcho.exe',
      'electron-build-fresh\\win-unpacked\\RusEcho.exe'
    ];

    for (const appPath of appPaths) {
      if (fs.existsSync(appPath)) {
        try {
          console.log(`\n📱 Testing: ${appPath}`);
          
          // Run multiple tests for average
          const times = [];
          for (let i = 0; i < 3; i++) {
            console.log(`   Test ${i + 1}/3...`);
            const startupTime = await this.testStartupTime(appPath);
            times.push(startupTime);
            
            // Wait between tests
            await new Promise(resolve => setTimeout(resolve, 3000));
          }

          const average = Math.round(times.reduce((a, b) => a + b, 0) / times.length);
          const min = Math.min(...times);
          const max = Math.max(...times);

          const result = {
            appPath,
            times,
            average,
            min,
            max,
            status: average < 10000 ? 'EXCELLENT' : average < 20000 ? 'GOOD' : average < 60000 ? 'ACCEPTABLE' : 'SLOW'
          };

          testResults.tests.push(result);

          console.log(`📊 Results for ${path.basename(appPath)}:`);
          console.log(`   Average: ${average}ms (${result.status})`);
          console.log(`   Range: ${min}ms - ${max}ms`);

        } catch (error) {
          console.error(`❌ Test failed for ${appPath}:`, error.message);
          testResults.tests.push({
            appPath,
            error: error.message,
            status: 'FAILED'
          });
        }
      } else {
        console.log(`⚠️  App not found: ${appPath}`);
      }
    }

    // Save results
    const reportPath = 'performance-test-results.json';
    fs.writeFileSync(reportPath, JSON.stringify(testResults, null, 2));

    // Display summary
    console.log('\n📈 Performance Test Summary:');
    console.log('=' .repeat(50));
    
    testResults.tests.forEach(test => {
      if (test.average) {
        console.log(`${path.basename(test.appPath)}: ${test.average}ms (${test.status})`);
      } else {
        console.log(`${path.basename(test.appPath)}: ${test.status}`);
      }
    });

    console.log(`\n📁 Full results saved to: ${reportPath}`);
    
    // Performance recommendations
    const bestResult = testResults.tests
      .filter(t => t.average)
      .sort((a, b) => a.average - b.average)[0];

    if (bestResult) {
      console.log('\n💡 Performance Recommendations:');
      
      if (bestResult.average < 5000) {
        console.log('🎉 Excellent performance! Your optimizations are working great.');
      } else if (bestResult.average < 15000) {
        console.log('✅ Good performance! Consider these additional optimizations:');
        console.log('   - Use SSD storage for faster file access');
        console.log('   - Close other applications during startup');
      } else {
        console.log('⚠️  Performance could be improved:');
        console.log('   - Consider using the portable version');
        console.log('   - Run the startup optimization script');
        console.log('   - Check for background applications consuming resources');
      }
    }

    return testResults;
  }
}

// Run tests if script is executed directly
if (require.main === module) {
  const tester = new PerformanceTester();
  tester.runPerformanceTests()
    .then(() => {
      console.log('\n✅ Performance testing completed!');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n❌ Performance testing failed:', error);
      process.exit(1);
    });
}

module.exports = PerformanceTester;
