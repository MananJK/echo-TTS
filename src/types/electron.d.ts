// Type definitions for Electron preload interface
interface IElectronAPI {
  /**
   * Open external OAuth authentication in the default browser
   * @param url The OAuth URL to open
   * @param redirectUrl The redirect URL that should be intercepted
   */
  openExternalAuth(url: string, redirectUrl: string): void;
  
  /**
   * Listen for OAuth authentication callbacks from main process
   * @param callback Function to call when authentication completes
   */
  onAuthCallback(callback: (data: { type: string, token?: string, error?: string }) => void): void;
}

declare global {
  interface Window {
    electron?: IElectronAPI;
  }
}

export {};