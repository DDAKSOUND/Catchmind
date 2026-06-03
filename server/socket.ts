import { Server as IOServer } from "socket.io";
import type { Server as HTTPServer } from "http";
import { GameEngine } from "./gameEngine";
import { SoopChatConnector } from "@/connectors/SoopChatConnector";
import type { DrawingEvent } from "@/types/drawing";
import type { ChatMessage } from "@/types/chat";
import type { GameState } from "@/types/game";

let gameEngine: GameEngine | null = null;
let soopConnector: SoopChatConnector | null = null;

const overlaySocketIds = new Set<string>();
const authedSocketIds  = new Set<string>();

const ADMIN_PIN = process.env.ADMIN_PIN ?? "";

if (!ADMIN_PIN) {
  console.warn("[보안 경고] ADMIN_PIN 환경변수가 설정되지 않았습니다. .env.local 파일을 확인하세요.");
}

export interface SoopStatus {
  connected: boolean;
  channelId?: string;
  error?: string;
  status?: string;
}

function stripAnswerForOverlay(state: GameState): GameState {
  if (state.roundStatus === "playing" || !state.isAnswerRevealed) {
    return { ...state, currentAnswer: "" };
  }
  return state;
}

function getAllowedOrigins(): string[] | string {
  const raw = process.env.ALLOWED_ORIGINS ?? "";
  if (!raw) return "*";
  return raw.split(",").map((s) => s.trim()).filter(Boolean);
}

export function initSocket(httpServer: HTTPServer): IOServer {
  const io = new IOServer(httpServer, {
    cors: {
      origin: getAllowedOrigins(),
      methods: ["GET", "POST"],
    },
  });

  let drawPaths: DrawingEvent[] = [];

  gameEngine = new GameEngine((event, data) => {
    if (event === "game:state") {
      const state = data as GameState;
      for (const [id, socket] of io.sockets.sockets) {
        if (overlaySocketIds.has(id)) {
          socket.emit("game:state", stripAnswerForOverlay(state));
        } else {
          socket.emit("game:state", state);
        }
      }
    } else {
      io.emit(event, data);
    }
  });

  io.on("connection", (socket) => {
    const clientType = socket.handshake.query.type as string | undefined;

    if (clientType === "overlay") {
      overlaySocketIds.add(socket.id);
    }

    // 상태 전송 (누구나)
    const state = gameEngine!.getState();
    if (clientType === "overlay") {
      socket.emit("game:state", stripAnswerForOverlay(state));
    } else {
      socket.emit("game:state", state);
    }

    const syncPaths = drawPaths.map((e) => e.path).filter(Boolean);
    socket.emit("drawing:sync", { paths: syncPaths });

    // ── 인증 ──────────────────────────────────────────────────────

    socket.on("admin:auth", (pin: string, callback?: (ok: boolean) => void) => {
      if (!ADMIN_PIN) {
        // PIN 미설정 시 개발 환경에서는 허용
        authedSocketIds.add(socket.id);
        callback?.(true);
        return;
      }
      if (pin === ADMIN_PIN) {
        authedSocketIds.add(socket.id);
        callback?.(true);
      } else {
        callback?.(false);
      }
    });

    function requireAuth(handler: (...args: unknown[]) => void) {
      return (...args: unknown[]) => {
        if (!authedSocketIds.has(socket.id)) return;
        handler(...args);
      };
    }

    // ── Host → Server ──────────────────────────────────────────────

    socket.on("host:startRound", requireAuth((payload: unknown) => {
      const p = payload as { answer: string; hint: string; timeLimit: number; baseScore: number };
      drawPaths = [];
      io.emit("drawing:sync", { paths: [] });
      gameEngine!.startRound(p);
    }));

    socket.on("host:endRound",    requireAuth(() => { gameEngine!.endRound(); }));
    socket.on("host:skipRound",   requireAuth(() => { gameEngine!.skipRound(); }));
    socket.on("host:revealAnswer",requireAuth(() => { gameEngine!.revealAnswer(); }));

    socket.on("host:clearCanvas", requireAuth(() => {
      drawPaths = [];
      io.emit("drawing:sync", { paths: [] });
    }));

    socket.on("host:resetScores", requireAuth(() => { gameEngine!.resetScores(); }));

    socket.on("host:updateSettings", requireAuth((settings: unknown) => {
      gameEngine!.updateSettings(settings as Partial<import("@/types/game").GameSettings>);
    }));

    // ── SOOP 연동 ──────────────────────────────────────────────────

    socket.on("admin:connectSoop", requireAuth(async (payload: unknown) => {
      const p = payload as string | { channelId: string; uid?: string; password?: string };
      const channelId = typeof p === "string" ? p : p.channelId;
      const uid       = typeof p === "object" ? p.uid : undefined;
      const password  = typeof p === "object" ? p.password : undefined;

      try {
        if (soopConnector) {
          await soopConnector.disconnect();
          soopConnector = null;
        }
        soopConnector = new SoopChatConnector();
        soopConnector.onMessage((msg: ChatMessage) => gameEngine!.processChat(msg));

        if (uid && password) {
          io.emit("soop:status", { connected: false, status: "로그인 중..." } satisfies SoopStatus);
          await soopConnector.login(uid, password);
        }

        io.emit("soop:status", { connected: false, status: "채팅 서버 연결 중..." } satisfies SoopStatus);
        await soopConnector.connect(channelId);
        io.emit("soop:status", { connected: true, channelId } satisfies SoopStatus);
      } catch (err) {
        soopConnector = null;
        io.emit("soop:status", {
          connected: false,
          error: err instanceof Error ? err.message : String(err),
        } satisfies SoopStatus);
      }
    }));

    socket.on("admin:disconnectSoop", requireAuth(async () => {
      if (soopConnector) {
        await soopConnector.disconnect();
        soopConnector = null;
      }
      io.emit("soop:status", { connected: false } satisfies SoopStatus);
    }));

    if (soopConnector?.isConnected()) {
      socket.emit("soop:status", { connected: true } satisfies SoopStatus);
    }

    // ── Drawing ────────────────────────────────────────────────────

    socket.on("drawing:update", requireAuth((event: unknown) => {
      const e = event as DrawingEvent;
      if (e.type === "clear") {
        drawPaths = [];
      } else if (e.type === "end" && e.path) {
        drawPaths.push(e);
      } else if (e.type === "undo") {
        drawPaths = drawPaths.slice(0, -1);
      }
      socket.broadcast.emit("drawing:update", e);
    }));

    // ── Chat (Mock) ────────────────────────────────────────────────

    socket.on("chat:message", requireAuth((message: unknown) => {
      gameEngine!.processChat(message as ChatMessage);
    }));

    socket.on("disconnect", () => {
      overlaySocketIds.delete(socket.id);
      authedSocketIds.delete(socket.id);
    });
  });

  return io;
}

export function getGameEngine(): GameEngine | null {
  return gameEngine;
}
