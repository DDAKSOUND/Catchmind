import type { ChatMessage } from "@/types/chat";

export interface ChatConnector {
  connect(channelId: string): Promise<void>;
  disconnect(): Promise<void>;
  onMessage(callback: (message: ChatMessage) => void): void;
  isConnected(): boolean;
}
