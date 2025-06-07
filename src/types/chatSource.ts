
export type ChatSource = 'youtube' | 'twitch' | 'manual';

export interface ChatConnection {
  id: string;
  type: ChatSource;
  channelName: string;
  isConnected: boolean;
  error?: string;
}
