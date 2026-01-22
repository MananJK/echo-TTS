import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false
    }
  },
  plugins: [
    react()
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  base: "./",
  build: {
    // Use source maps only in development mode
    sourcemap: process.env.NODE_ENV === 'development',
    // Optimize module chunks for faster loading
    rollupOptions: {
      output: {
        manualChunks: {
          // Core React chunks
          'react-vendor': ['react', 'react-dom'],
          'react-router': ['react-router-dom'],
          
          // UI Library chunks
          'radix-core': [
            '@radix-ui/react-dialog',
            '@radix-ui/react-tooltip',
            '@radix-ui/react-popover',
            '@radix-ui/react-slider',
            '@radix-ui/react-select',
            '@radix-ui/react-switch'
          ],
          'radix-extended': [
            '@radix-ui/react-accordion',
            '@radix-ui/react-tabs',
            '@radix-ui/react-dropdown-menu',
            '@radix-ui/react-navigation-menu'
          ],
          
          // Utility chunks
          'ui-utils': ['lucide-react', 'sonner', 'tailwind-merge', 'class-variance-authority'],
          'form-utils': ['react-hook-form', '@hookform/resolvers', 'zod'],
          'query-utils': ['@tanstack/react-query'],
          'date-utils': ['date-fns', 'react-day-picker'],
          
          // Chat/Stream specific
          'stream-utils': ['tmi.js'],
          
          // Chart/Data visualization
          'chart-utils': ['recharts', 'embla-carousel-react']
        },
        // Minimize chunk size and improve loading
        chunkFileNames: (chunkInfo) => {
          // Use shorter names for faster loading
          return `js/[name]-[hash:8].js`;
        },
        entryFileNames: 'js/[name]-[hash:8].js',
        assetFileNames: (assetInfo) => {
          if (assetInfo.name?.endsWith('.css')) {
            return 'css/[name]-[hash:8].css';
          }
          return 'assets/[name]-[hash:8][extname]';
        }
      }
    },
    // Advanced minification for smaller bundle size
    minify: process.env.NODE_ENV === 'production' ? 'terser' : false,
    terserOptions: {
      compress: {
        passes: 3, // Multiple passes for better compression
        drop_console: process.env.NODE_ENV === 'production',
        drop_debugger: true,
        pure_funcs: ['console.log', 'console.info', 'console.debug'],
        dead_code: true,
        unused: true
      },
      mangle: {
        safari10: true
      },
      format: {
        comments: false
      }
    },
    // Optimize CSS
    cssMinify: true,
    // Reduce chunk size warning threshold
    chunkSizeWarningLimit: 800,
    // Enable aggressive optimization
    target: 'es2020',
    // Optimize asset handling
    assetsInlineLimit: 4096,
    // Improve build performance
    reportCompressedSize: false
  },
  // Advanced dependency optimization
  optimizeDeps: {
    include: [
      'react', 
      'react-dom', 
      'react-router-dom',
      '@tanstack/react-query',
      'lucide-react',
      'tmi.js',
      'sonner',
      'tailwind-merge',
      'class-variance-authority'
    ],
    exclude: ['@vite/client', '@vite/env'],
    esbuildOptions: {
      target: 'es2020',
      supported: {
        'top-level-await': true
      }
    }
  },
  // Faster startup by reducing ESBuild transforms
  esbuild: {
    target: 'es2020',
    // Advanced tree shaking
    treeShaking: true,
    legalComments: 'none',
    logLevel: 'error',
    // Drop specific functions in production
    drop: process.env.NODE_ENV === 'production' ? ['console', 'debugger'] : [],
    // Optimize JSX
    jsxFactory: 'React.createElement',
    jsxFragment: 'React.Fragment'
  },
  // Define global constants for better tree shaking
  define: {
    __DEV__: process.env.NODE_ENV === 'development',
    __PROD__: process.env.NODE_ENV === 'production'
  }
});
