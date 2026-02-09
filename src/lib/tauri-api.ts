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
  console.log(`TauriAPI: Requesting auth for URL: ${url}`);
  console.log(`TauriAPI: Redirect URL: ${redirectUrl}`);
  
  if (!isTauriAvailable()) {
    throw new Error('Tauri is not available');
  }
  
  try {
    await open(url);
    console.log('TauriAPI: OAuth URL opened successfully');
  } catch (error) {
    console.error('TauriAPI: Failed to open URL:', error);
    throw error;
  }
};

export const onAuthCallback = (callback: (data: AuthCallbackData) => void): (() => void) => {
  console.log('TauriAPI: Setting up auth callback listener');
  
  if (!isTauriAvailable()) {
    console.warn('TauriAPI: Tauri not available, returning no-op callback');
    return () => {};
  }
  
  const unlisten = listen<AuthCallbackData>('auth-callback', (event) => {
    console.log('TauriAPI: Auth callback received for:', event.payload.type);
    console.log('TauriAPI: Token present:', !!event.payload.token);
    
    const data = event.payload;
    
    window.postMessage(data, '*');
    
    callback(data);
  });
  
  return () => {
    unlisten.then(fn => fn()).catch(console.error);
  };
};

export const onAlert = (callback: (data: AlertData) => void): (() => void) => {
  console.log('TauriAPI: Setting up alert listener');
  
  if (!isTauriAvailable()) {
    console.warn('TauriAPI: Tauri not available, returning no-op alert callback');
    return () => {};
  }
  
  const unlisten = listen<AlertData>('integration-alert', (event) => {
    console.log('TauriAPI: Alert received:', event.payload);
    
    const data = event.payload;
    
    window.postMessage(data, '*');
    
    callback(data);
  });
  
  return () => {
    unlisten.then(fn => fn()).catch(console.error);
  };
};