import type { ChatConnector } from "./ChatConnector";
import type { ChatMessage } from "@/types/chat";

/**
 * SOOP 실시간 채팅 연동 커넥터.
 * 현재는 구조만 작성해두고 실제 연동은 추후 구현한다.
 *
 * TODO: SOOP 공식 API 또는 허용된 채팅 연동 방식이 확인되면 아래를 구현한다.
 * - SOOP 로그인/인증
 * - WebSocket 또는 공식 채팅 API 연결
 * - 채팅 메시지 파싱
 * - 재연결 로직
 */
export class SoopChatConnector implements ChatConnector {
  private messageCallback: ((message: ChatMessage) => void) | null = null;
  private connected = false;

  async connect(_channelId: string): Promise<void> {
    // TODO: Implement SOOP chat connection using official API
    throw new Error("SoopChatConnector is not yet implemented.");
  }

  async disconnect(): Promise<void> {
    // TODO: Clean up SOOP connection
    this.connected = false;
  }

  onMessage(callback: (message: ChatMessage) => void): void {
    this.messageCallback = callback;
  }

  isConnected(): boolean {
    return this.connected;
  }
}
