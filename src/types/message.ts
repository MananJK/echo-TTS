
export interface Message {
  id: string;
  content: string;
  timestamp: number;
  username?: string;
  status: 'pending' | 'playing' | 'completed' | 'error';
}
