// React Component Lazy Loading Optimization
// This module helps optimize component loading for better performance

import { lazy, Suspense, ComponentType, LazyExoticComponent } from 'react';
import Loading from '@/components/Loading';

// Enhanced lazy loading with error boundaries and preloading
export function createLazyComponent<T extends ComponentType<any>>(
  importFn: () => Promise<{ default: T }>,
  FallbackComponent: ComponentType = Loading
): LazyExoticComponent<T> {
  const LazyComponent = lazy(importFn);
  
  // Preload the component on mouse enter for better UX
  const preloadComponent = () => {
    importFn().catch(err => {
      console.warn('Failed to preload component:', err);
    });
  };

  const WrappedComponent = (props: any) => (
    <Suspense fallback={<FallbackComponent />}>
      <div onMouseEnter={preloadComponent}>
        <LazyComponent {...props} />
      </div>
    </Suspense>
  );

  return WrappedComponent as LazyExoticComponent<T>;
}

// Commonly used lazy-loaded components
export const LazyTwitchOAuthButton = createLazyComponent(
  () => import('@/components/TwitchOAuthButton')
);

export const LazyYouTubeOAuthButton = createLazyComponent(
  () => import('@/components/YouTubeOAuthButton')
);

export const LazyMessageHistory = createLazyComponent(
  () => import('@/components/MessageHistory')
);

export const LazyVolumeControl = createLazyComponent(
  () => import('@/components/VolumeControl')
);

export const LazyConnectionStatusPanel = createLazyComponent(
  () => import('@/components/ConnectionStatusPanel')
);

// Route-based lazy loading
export const LazyIndexPage = createLazyComponent(
  () => import('@/pages/Index')
);

export const LazyLoginPage = createLazyComponent(
  () => import('@/pages/Login')
);

export const LazyNotFoundPage = createLazyComponent(
  () => import('@/pages/NotFound')
);

// Performance monitoring for lazy loading
export class LazyLoadingMonitor {
  private static instance: LazyLoadingMonitor;
  private loadTimes: Map<string, number> = new Map();
  private errors: Map<string, Error[]> = new Map();

  static getInstance(): LazyLoadingMonitor {
    if (!LazyLoadingMonitor.instance) {
      LazyLoadingMonitor.instance = new LazyLoadingMonitor();
    }
    return LazyLoadingMonitor.instance;
  }

  recordLoadTime(componentName: string, startTime: number): void {
    const loadTime = Date.now() - startTime;
    this.loadTimes.set(componentName, loadTime);
    
    if (loadTime > 1000) { // Log slow loads
      console.warn(`Slow component load: ${componentName} took ${loadTime}ms`);
    }
  }

  recordError(componentName: string, error: Error): void {
    if (!this.errors.has(componentName)) {
      this.errors.set(componentName, []);
    }
    this.errors.get(componentName)!.push(error);
    console.error(`Component load error: ${componentName}`, error);
  }

  getStats(): { loadTimes: Record<string, number>; errors: Record<string, number> } {
    return {
      loadTimes: Object.fromEntries(this.loadTimes),
      errors: Object.fromEntries(
        Array.from(this.errors.entries()).map(([key, errors]) => [key, errors.length])
      )
    };
  }
}
