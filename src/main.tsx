import { createRoot } from 'react-dom/client'
import { StrictMode } from 'react'
import App from './App.tsx'
import './index.css'

// Performance optimizations
import { initializePerformanceMonitoring } from './lib/performance-monitor.ts'

// Start performance monitoring
const startTime = performance.now();
initializePerformanceMonitoring();

// Optimize root element creation
const rootElement = document.getElementById("root");
if (!rootElement) {
  throw new Error('Root element not found');
}

const root = createRoot(rootElement);

// Use concurrent features for better performance
root.render(
  <StrictMode>
    <App />
  </StrictMode>
);

// Log initial render time
requestIdleCallback(() => {
  const loadTime = performance.now() - startTime;
  console.log(`🚀 App rendered in ${loadTime.toFixed(2)}ms`);
  
  // Force garbage collection if available (development only)
  if (process.env.NODE_ENV === 'development' && 'gc' in window) {
    (window as any).gc();
  }
});
