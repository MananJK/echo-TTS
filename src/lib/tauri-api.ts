import { invoke, listen } from '@tauri-apps/api/event';
import { open } from '@tauri-apps/plugin-shell';

export const isTauriAvailable = (): boolean => {
  try {
    return window.__TAURI__ !== undefined;
  } catch (e) {
    return false;
  }
};

export interface AuthCallbackData {
  type: string;
  token: string;
  error?: string;
  service?: string;
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
    unlisten.then(fn => fn());
  };
};