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

const LOGIN_ENDPOINTS = [
  "https://login.sooplive.com/app/LoginAction.php",
  "https://login.sooplive.co.kr/app/LoginAction.php",
];

const API_ENDPOINTS = [
  "https://live.sooplive.co.kr/afreeca/player_live_api.php",
  "https://live.afreecatv.com/afreeca/player_live_api.php",
];

const COMMON_HEADERS = {
  "Content-Type": "application/x-www-form-urlencoded",
  "Referer": "https://play.sooplive.co.kr/",
  "Origin": "https://play.sooplive.co.kr",
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
};

export class SoopChatConnector implements ChatConnector {
  private ws: WebSocket | null = null;
  private messageCallback: ((msg: ChatMessage) => void) | null = null;
  private pingTimer: ReturnType<typeof setInterval> | null = null;
  private _connected = false;
  private cookies = "";

  async login(uid: string, password: string): Promise<void> {
    let lastError: Error = new Error("알 수 없는 오류");

    for (const url of LOGIN_ENDPOINTS) {
      try {
        const res = await fetch(url, {
          method: "POST",
          headers: COMMON_HEADERS,
          body: new URLSearchParams({
            szWork: "login",
            szType: "json",
            szUid: uid,
            szPassword: password,
          }).toString(),
          signal: AbortSignal.timeout(8_000),
        });

        if (!res.ok) { lastError = new Error(`HTTP ${res.status} (${url})`); continue; }

        const data = await res.json() as Record<string, unknown>;
        // 비밀번호/쿠키는 로그에 출력하지 않음
        console.log("[SOOP] login response RESULT:", data.RESULT ?? data.result ?? "(없음)");

        // 로그인 실패 체크
        const result = data.RESULT ?? data.result;
        if (result !== undefined && Number(result) < 0) {
          throw new Error(`로그인 실패 (RESULT=${result}). 아이디/비밀번호를 확인하세요.`);
        }

        // Set-Cookie 헤더에서 쿠키 추출 (Node.js 18+)
        const setCookies: string[] = [];
        try {
          const arr = (res.headers as unknown as { getSetCookie?: () => string[] }).getSetCookie?.() ?? [];
          setCookies.push(...arr.map((c) => c.split(";")[0]));
        } catch {
          const raw = res.headers.get("set-cookie");
          if (raw) setCookies.push(...raw.split(",").map((c) => c.split(";")[0].trim()));
        }

        if (setCookies.length === 0) {
          throw new Error("로그인 실패: 쿠키를 받지 못했습니다. 아이디/비밀번호를 확인하세요.");
        }

        this.cookies = setCookies.join("; ");
        console.log("[SOOP] login success, cookie count:", setCookies.length);
        return;
      } catch (e) {
        lastError = e instanceof Error ? e : new Error(String(e));
        if (lastError.message.includes("실패") || lastError.message.includes("RESULT")) throw lastError;
      }
    }
    throw lastError;
  }

  private async fetchBroadcastInfo(channelId: string): Promise<BroadcastInfo> {
    let lastError: Error = new Error("알 수 없는 오류");

    const headers: Record<string, string> = { ...COMMON_HEADERS };
    if (this.cookies) headers["Cookie"] = this.cookies;

    for (const url of API_ENDPOINTS) {
      try {
        const res = await fetch(url, {
          method: "POST",
          headers,
          body: `bid=${encodeURIComponent(channelId)}&mode=landing&player_type=html5`,
          signal: AbortSignal.timeout(8_000),
        });
        if (!res.ok) { lastError = new Error(`HTTP ${res.status} (${url})`); continue; }

        const data = await res.json() as Record<string, unknown>;
        const ch = (data.CHANNEL ?? data) as Record<string, unknown>;
        console.log("[SOOP] CHANNEL fields:", JSON.stringify(ch));

        const result = Number(ch.RESULT);
        if (result === -6) throw new Error(`채널을 찾을 수 없습니다: ${channelId}`);
        if (result !== 1)  throw new Error(`방송 중이 아닙니다 (RESULT=${result}, 채널: ${channelId})`);

        const domain = String(ch.CHDOMAIN ?? ch.chdomain ?? "");
        const port   = String(ch.CHPT    ?? ch.chpt    ?? "9000");
        const chatNo = String(ch.CHATNO  ?? ch.chatno  ?? "");
        const bno    = String(ch.BNO     ?? ch.bno     ?? "");
        const ftk    = String(ch.FTK     ?? ch.ftk     ?? "");

        if (!domain) throw new Error(`채팅 서버 주소(CHDOMAIN)가 없습니다. 응답: ${JSON.stringify(data).slice(0, 200)}`);

        if (!ftk) console.warn("[SOOP] 경고: FTK가 비어있습니다. 로그인 없이 연결을 시도합니다.");

        return { chatDomain: domain, chatPort: port, chatNo, ftk, bno };
      } catch (e) {
        lastError = e instanceof Error ? e : new Error(String(e));
        if (
          lastError.message.includes("찾을 수 없습니다") ||
          lastError.message.includes("방송 중이 아닙니다") ||
          lastError.message.includes("CHDOMAIN")
        ) throw lastError;
      }
    }
    throw lastError;
  }

  async connect(channelId: string): Promise<void> {
    const info = await this.fetchBroadcastInfo(channelId);
    const joinBody = ["", channelId, info.bno, "0", "0", "", info.ftk, "", "2", info.chatNo, ""].join(F);
    const wsHeaders = {
      "Origin": "https://play.sooplive.co.kr",
      "Referer": "https://play.sooplive.co.kr/",
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
      ...(this.cookies ? { "Cookie": this.cookies } : {}),
    };

    const tryConnect = (wsUrl: string, rejectUnauthorized = true): Promise<void> =>
      new Promise((resolve, reject) => {
        console.log("[SOOP] connecting to", wsUrl, rejectUnauthorized ? "" : "(rejectUnauthorized=false)");
        const wsOpts: import("ws").ClientOptions = {
          headers: wsHeaders,
          ...(wsUrl.startsWith("wss://") && !rejectUnauthorized
            ? { rejectUnauthorized: false }
            : {}),
        };
        const ws = new WebSocket(wsUrl, wsOpts);
        const timeout = setTimeout(() => { ws.terminate(); reject(new Error("timeout")); }, 12_000);

        let stage: "connecting" | "joining" | "done" = "connecting";

        const onHandshake = (raw: Buffer | string) => {
          const pktType = parseType(raw);
          console.log(`[SOOP] handshake stage=${stage} pktType=0x${pktType.toString(16)}`);
          if (stage === "connecting") {
            stage = "joining";
            ws.send(buildPacket(PKT_JOIN, joinBody));
          } else if (stage === "joining") {
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

        ws.on("open", () => {
          console.log("[SOOP] WebSocket opened:", wsUrl);
          ws.send(buildPacket(PKT_CONNECT, `16${F}`));
        });
        ws.on("message", onHandshake);
        ws.on("error", (err) => { clearTimeout(timeout); reject(err); });
        ws.on("close", () => {
          clearTimeout(timeout);
          if (stage !== "done") reject(new Error("closed"));
        });
      });

    const base = `${info.chatDomain}:${info.chatPort}/Websocket/${channelId}`;
    const attempts: Array<[string, boolean]> = [
      [`wss://${base}`, true],
      [`wss://${base}`, false],
      [`ws://${base}`,  true],
    ];
    let lastErr: Error = new Error("알 수 없는 오류");
    for (const [url, rejectUnauth] of attempts) {
      try {
        await tryConnect(url, rejectUnauth);
        return;
      } catch (e) {
        lastErr = e instanceof Error ? e : new Error(String(e));
        console.log(`[SOOP] attempt failed (${url}):`, lastErr.message);
      }
    }
    throw new Error(`SOOP 채팅 서버 연결 실패. 채널: ${channelId} / 마지막 오류: ${lastErr.message}`);
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
