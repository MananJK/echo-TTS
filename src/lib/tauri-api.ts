import { listen } from '@tauri-apps/api/event';
import { open } from '@tauri-apps/plugin-shell';

export const isTauriAvailable = (): boolean => {
  // Simple check for Tauri environment
  return typeof window !== 'undefined' && 
         '__TAURI__' in window;
};

export interface AuthCallbackData {
  type: string;
  token: string;
  error?: string;
  service?: string;
  refresh_token?: string;
  expires_in?: number;
}

export interface AlertData {
  platform: string;
  alert_type: string;
  user_name: string;
  message: string;
  amount?: string;
  currency?: string;
  count?: number;
}

export const openExternalAuth = async (url: string, redirectUrl: string): Promise<void> => {
  
  if (!isTauriAvailable()) {
    throw new Error('Tauri is not available');
  }
  
  try {
    await open(url);
  } catch (error) {
    console.error('TauriAPI: Failed to open URL:', error);
    throw error;
  }
};

export const onAuthCallback = (callback: (data: AuthCallbackData) => void): (() => void) => {
  
  if (!isTauriAvailable()) {
    console.warn('TauriAPI: Tauri not available, returning no-op callback');
    return () => {};
  }
  
  const unlisten = listen<AuthCallbackData>('auth-callback', (event) => {
    
    const data = event.payload;
    
    window.postMessage(data, window.location.origin);
    
    callback(data);
  });
  
  return () => {
    unlisten.then(fn => fn()).catch(console.error);
  };
};

export const onAlert = (callback: (data: AlertData) => void): (() => void) => {
  
  if (!isTauriAvailable()) {
    console.warn('TauriAPI: Tauri not available, returning no-op alert callback');
    return () => {};
  }
  
  const unlisten = listen<AlertData>('integration-alert', (event) => {
    
    const data = event.payload;
    
    window.postMessage(data, window.location.origin);
    
    callback(data);
  });
  
  return () => {
    unlisten.then(fn => fn()).catch(console.error);
  };
};