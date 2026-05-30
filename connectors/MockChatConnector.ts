import type { ChatConnector } from "./ChatConnector";
import type { ChatMessage } from "@/types/chat";

export class MockChatConnector implements ChatConnector {
  private messageCallback: ((message: ChatMessage) => void) | null = null;
  private connected = false;

  async connect(_channelId: string): Promise<void> {
    this.connected = true;
  }

  async disconnect(): Promise<void> {
    this.connected = false;
    this.messageCallback = null;
  }

  onMessage(callback: (message: ChatMessage) => void): void {
    this.messageCallback = callback;
  }

  isConnected(): boolean {
    return this.connected;
  }

  /** Called by MockChatInput component via Socket.IO */
  simulateMessage(nickname: string, message: string): void {
    if (!this.messageCallback) return;
    this.messageCallback({
      nickname,
      message,
      timestamp: new Date().toISOString(),
      source: "mock",
    });
  }
}
