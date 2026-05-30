import WebSocket from "ws";
import type { ChatConnector } from "./ChatConnector";
import type { ChatMessage } from "@/types/chat";

// SOOP(구 아프리카TV) 채팅 프로토콜 상수
const F = "\x0C"; // 필드 구분자 (Form Feed)
const PKT_CONNECT = 0x0000;
const PKT_JOIN    = 0x0006;
const PKT_PING    = 0x0005;
const PKT_CHAT    = 0x0066;
const KEEPALIVE_MS = 60_000;

// 패킷 형식: ESC STX [6자리 바디길이] [4자리 타입(hex)] 00000000 CRLF [바디] CRLF
function buildPacket(type: number, body = ""): Buffer {
  const bodyBuf = Buffer.from(body, "utf8");
  const header = `\x1b\x02${String(bodyBuf.length).padStart(6, "0")}${type.toString(16).padStart(4, "0")}00000000\r\n`;
  return Buffer.concat([Buffer.from(header, "utf8"), bodyBuf, Buffer.from("\r\n", "utf8")]);
}

function parseType(raw: Buffer | string): number {
  const s = typeof raw === "string" ? raw : raw.toString("utf8");
  if (s.length < 12 || s.charCodeAt(0) !== 0x1b) return -1;
  return parseInt(s.substring(8, 12), 16);
}

function parseBody(raw: Buffer | string): string {
  const s = typeof raw === "string" ? raw : raw.toString("utf8");
  // 헤더: ESC STX [6] [4] [8] CRLF = 22자
  const body = s.slice(22);
  return body.endsWith("\r\n") ? body.slice(0, -2) : body;
}

interface BroadcastInfo {
  chatDomain: string;
  chatPort: string;
  chatNo: string;
  ftk: string;
  bno: string;
}

async function fetchBroadcastInfo(channelId: string): Promise<BroadcastInfo> {
  const endpoints = [
    "https://live.sooplive.co.kr/afreeca/player_live_api.php",
    "https://live.afreecatv.com/afreeca/player_live_api.php",
  ];

  let lastError: Error = new Error("알 수 없는 오류");

  for (const url of endpoints) {
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: `bid=${encodeURIComponent(channelId)}&mode=landing&player_type=html5`,
        signal: AbortSignal.timeout(8_000),
      });
      if (!res.ok) { lastError = new Error(`HTTP ${res.status}`); continue; }

      const data = await res.json() as Record<string, unknown>;
      if (Number(data.RESULT) !== 1) {
        throw new Error(`방송 중이 아니거나 채널을 찾을 수 없습니다. (${channelId})`);
      }
      return {
        chatDomain: String(data.CHDOMAIN),
        chatPort:   String(data.CHPT),
        chatNo:     String(data.CHATNO),
        ftk:        String(data.FTK ?? ""),
        bno:        String(data.BNO),
      };
    } catch (e) {
      lastError = e instanceof Error ? e : new Error(String(e));
      // RESULT !== 1 이면 재시도 없이 즉시 throw
      if (lastError.message.includes("방송 중이 아니거나")) throw lastError;
    }
  }
  throw lastError;
}

export class SoopChatConnector implements ChatConnector {
  private ws: WebSocket | null = null;
  private messageCallback: ((msg: ChatMessage) => void) | null = null;
  private pingTimer: ReturnType<typeof setInterval> | null = null;
  private _connected = false;

  async connect(channelId: string): Promise<void> {
    const info = await fetchBroadcastInfo(channelId);
    const wsUrl = `wss://${info.chatDomain}:${info.chatPort}/Websocket/${channelId}`;

    // JOIN 패킷 바디: 첫 필드 비어있음, 이후 채널/방번호/토큰 등
    const joinBody = ["", channelId, info.bno, "0", "0", "", info.ftk, "", "2", info.chatNo, ""].join(F);

    return new Promise((resolve, reject) => {
      const ws = new WebSocket(wsUrl);
      const timeout = setTimeout(() => { ws.terminate(); reject(new Error("연결 시간 초과 (15초)")); }, 15_000);

      // 핸드셰이크 상태: connecting → joining → done
      let stage: "connecting" | "joining" | "done" = "connecting";

      const onHandshake = (_raw: Buffer | string) => {
        if (stage === "connecting") {
          // 서버 CONNECT 응답 수신 → JOIN 전송
          stage = "joining";
          ws.send(buildPacket(PKT_JOIN, joinBody));
        } else if (stage === "joining") {
          // 서버 JOIN 응답 수신 → 연결 완료
          stage = "done";
          clearTimeout(timeout);
          this._connected = true;
          this.ws = ws;
          this.startPing();

          ws.off("message", onHandshake);
          ws.on("message", (r: Buffer | string) => this.handleMessage(r));
          ws.on("close", () => { this._connected = false; this.stopPing(); });
          resolve();
        }
      };

      ws.on("open", () => ws.send(buildPacket(PKT_CONNECT, `16${F}`)));
      ws.on("message", onHandshake);
      ws.on("error", (err) => { clearTimeout(timeout); reject(err); });
      ws.on("close", () => {
        clearTimeout(timeout);
        if (stage !== "done") reject(new Error("WebSocket 연결이 닫혔습니다"));
      });
    });
  }

  private handleMessage(raw: Buffer | string): void {
    if (!this.messageCallback) return;
    const type = parseType(raw);
    if (type !== PKT_CHAT) return;

    const fields = parseBody(raw).split(F);
    // fields: [bid, 메시지, userId, 닉네임, ...]
    const text     = fields[1] ?? "";
    const nickname = fields[3] || fields[2] || "시청자";
    if (!text) return;

    this.messageCallback({
      nickname,
      message: text,
      timestamp: new Date().toISOString(),
      source: "soop",
    });
  }

  async disconnect(): Promise<void> {
    this.stopPing();
    this.ws?.terminate();
    this.ws = null;
    this._connected = false;
  }

  onMessage(callback: (msg: ChatMessage) => void): void {
    this.messageCallback = callback;
  }

  isConnected(): boolean {
    return this._connected;
  }

  private startPing(): void {
    this.pingTimer = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.ws.send(buildPacket(PKT_PING));
      }
    }, KEEPALIVE_MS);
  }

  private stopPing(): void {
    if (this.pingTimer) { clearInterval(this.pingTimer); this.pingTimer = null; }
  }
}
