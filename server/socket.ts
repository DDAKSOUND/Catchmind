import { Server as IOServer } from "socket.io";
import type { Server as HTTPServer } from "http";
import { GameEngine } from "./gameEngine";
import type { DrawingEvent } from "@/types/drawing";
import type { ChatMessage } from "@/types/chat";
import type { GameState } from "@/types/game";

let gameEngine: GameEngine | null = null;

const overlaySocketIds = new Set<string>();

function stripAnswerForOverlay(state: GameState): GameState {
  // Never expose the answer to overlay during playing state
  if (state.roundStatus === "playing" || !state.isAnswerRevealed) {
    return { ...state, currentAnswer: "" };
  }
  return state;
}

export function initSocket(httpServer: HTTPServer): IOServer {
  const io = new IOServer(httpServer, {
    cors: { origin: "*", methods: ["GET", "POST"] },
  });

  // Drawing paths stored server-side so late-joining overlays get full sync
  let drawPaths: DrawingEvent[] = [];

  gameEngine = new GameEngine((event, data) => {
    if (event === "game:state") {
      const state = data as GameState;
      // Broadcast to all, but strip answer for overlay sockets
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

    // Send full game state on connect
    const state = gameEngine!.getState();
    if (clientType === "overlay") {
      socket.emit("game:state", stripAnswerForOverlay(state));
    } else {
      socket.emit("game:state", state);
    }

    // Send drawing history to new clients
    const syncPaths = drawPaths.map((e) => e.path).filter(Boolean);
    socket.emit("drawing:sync", { paths: syncPaths });

    // ── Host → Server ──────────────────────────────────────────────

    socket.on("host:startRound", (payload: {
      answer: string;
      hint: string;
      timeLimit: number;
      baseScore: number;
    }) => {
      drawPaths = [];
      io.emit("drawing:sync", { paths: [] });
      gameEngine!.startRound(payload);
    });

    socket.on("host:endRound", () => {
      gameEngine!.endRound();
    });

    socket.on("host:skipRound", () => {
      gameEngine!.skipRound();
    });

    socket.on("host:revealAnswer", () => {
      gameEngine!.revealAnswer();
    });

    socket.on("host:clearCanvas", () => {
      drawPaths = [];
      io.emit("drawing:sync", { paths: [] });
    });

    socket.on("host:resetScores", () => {
      gameEngine!.resetScores();
    });

    socket.on("host:updateSettings", (settings: Partial<import("@/types/game").GameSettings>) => {
      gameEngine!.updateSettings(settings);
    });

    // ── Drawing ────────────────────────────────────────────────────

    socket.on("drawing:update", (event: DrawingEvent) => {
      if (event.type === "clear") {
        drawPaths = [];
      } else if (event.type === "end" && event.path) {
        drawPaths.push(event);
      } else if (event.type === "undo") {
        drawPaths = drawPaths.slice(0, -1);
      }
      // Broadcast to all except sender
      socket.broadcast.emit("drawing:update", event);
    });

    // ── Chat ───────────────────────────────────────────────────────

    socket.on("chat:message", (message: ChatMessage) => {
      gameEngine!.processChat(message);
    });

    socket.on("disconnect", () => {
      overlaySocketIds.delete(socket.id);
    });
  });

  return io;
}

export function getGameEngine(): GameEngine | null {
  return gameEngine;
}
