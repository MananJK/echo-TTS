// Performance Monitoring Service for React App
// Tracks performance metrics and provides optimization insights

export class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private metrics: Map<string, number[]> = new Map();
  private observers: PerformanceObserver[] = [];
  private isMonitoring = false;

  static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }

  start(): void {
    if (this.isMonitoring) return;
    
    this.isMonitoring = true;
    this.setupPerformanceObservers();
    this.trackInitialLoad();
    this.monitorMemoryUsage();
    
  }

  stop(): void {
    this.isMonitoring = false;
    this.observers.forEach(observer => observer.disconnect());
    this.observers = [];
    
  }

  private setupPerformanceObservers(): void {
    // Track navigation timing
    if ('PerformanceObserver' in window) {
      try {
        const navigationObserver = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (entry.entryType === 'navigation') {
              this.recordMetric('navigation', entry.duration);
            }
          }
        });
        navigationObserver.observe({ entryTypes: ['navigation'] });
        this.observers.push(navigationObserver);

        // Track resource loading
        const resourceObserver = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (entry.entryType === 'resource') {
              this.recordMetric(`resource-${entry.name}`, entry.duration);
            }
          }
        });
        resourceObserver.observe({ entryTypes: ['resource'] });
        this.observers.push(resourceObserver);

        // Track paint metrics
        const paintObserver = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (entry.entryType === 'paint') {
              this.recordMetric(`paint-${entry.name}`, entry.startTime);
            }
          }
        });
        paintObserver.observe({ entryTypes: ['paint'] });
        this.observers.push(paintObserver);

      } catch (error) {
        console.warn('Performance observer setup failed:', error);
      }
    }
  }

  private trackInitialLoad(): void {
    // Track when the app becomes interactive
    if (document.readyState === 'loading') {
      const startTime = performance.now();
      
      document.addEventListener('DOMContentLoaded', () => {
        const domLoadTime = performance.now() - startTime;
        this.recordMetric('dom-content-loaded', domLoadTime);
      });

      window.addEventListener('load', () => {
        const fullLoadTime = performance.now() - startTime;
        this.recordMetric('window-load', fullLoadTime);
      });
    }
  }

  private monitorMemoryUsage(): void {
    if ('memory' in performance) {
      setInterval(() => {
        if (this.isMonitoring) {
          const memory = (performance as any).memory;
          this.recordMetric('memory-used', memory.usedJSHeapSize);
          this.recordMetric('memory-total', memory.totalJSHeapSize);
          
          // Warn about high memory usage
          const memoryUsagePercent = (memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100;
          if (memoryUsagePercent > 80) {
            console.warn(`High memory usage: ${memoryUsagePercent.toFixed(1)}%`);
          }
        }
      }, 5000); // Check every 5 seconds
    }
  }

  recordMetric(name: string, value: number): void {
    if (!this.metrics.has(name)) {
      this.metrics.set(name, []);
    }
    this.metrics.get(name)!.push(value);
    
    // Keep only last 100 measurements
    const values = this.metrics.get(name)!;
    if (values.length > 100) {
      values.shift();
    }
  }

  getMetrics(): Record<string, { avg: number; min: number; max: number; count: number }> {
    const result: Record<string, { avg: number; min: number; max: number; count: number }> = {};
    
    for (const [name, values] of this.metrics.entries()) {
      if (values.length === 0) continue;
      
      const sum = values.reduce((a, b) => a + b, 0);
      result[name] = {
        avg: sum / values.length,
        min: Math.min(...values),
        max: Math.max(...values),
        count: values.length
      };
    }
    
    return result;
  }

  getPerformanceSummary(): string {
    const metrics = this.getMetrics();
    const summary = [];
    
    // App load performance
    if (metrics['window-load']) {
      summary.push(`App Load: ${metrics['window-load'].avg.toFixed(0)}ms`);
    }
    
    // Paint performance
    if (metrics['paint-first-contentful-paint']) {
      summary.push(`First Paint: ${metrics['paint-first-contentful-paint'].avg.toFixed(0)}ms`);
    }
    
    // Memory usage
    if (metrics['memory-used']) {
      const memoryMB = (metrics['memory-used'].avg / 1024 / 1024).toFixed(1);
      summary.push(`Memory: ${memoryMB}MB`);
    }
    
    return summary.join(' | ');
  }

  // Component-specific performance tracking
  trackComponentRender(componentName: string, renderTime: number): void {
    this.recordMetric(`component-${componentName}`, renderTime);
    
    if (renderTime > 100) { // Log slow renders
      console.warn(`Slow component render: ${componentName} took ${renderTime}ms`);
    }
  }

  // Network request tracking
  trackNetworkRequest(url: string, duration: number, success: boolean): void {
    this.recordMetric(`network-${success ? 'success' : 'error'}`, duration);
    
    if (duration > 5000) { // Log slow requests
      console.warn(`Slow network request: ${url} took ${duration}ms`);
    }
  }
}

// React hook for component performance tracking
export function usePerformanceTracking(componentName: string) {
  const monitor = PerformanceMonitor.getInstance();
  
  return {
    trackRender: (renderTime: number) => monitor.trackComponentRender(componentName, renderTime),
    trackMetric: (name: string, value: number) => monitor.recordMetric(`${componentName}-${name}`, value)
  };
}

// Initialize performance monitoring
export function initializePerformanceMonitoring(): void {
  const monitor = PerformanceMonitor.getInstance();
  monitor.start();
  
  // Log performance summary every 30 seconds in development
  if (process.env.NODE_ENV === 'development') {
    setInterval(() => {
    }, 30000);
  }
}

// Export singleton instance
export const performanceMonitor = PerformanceMonitor.getInstance();
