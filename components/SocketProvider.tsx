"use client";
import { createContext, useContext, useEffect, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";
import { useGameStore } from "@/lib/useGameStore";
import type { GameState, WrongAnswer } from "@/types/game";
import type { DrawingEvent } from "@/types/drawing";

interface SocketContextValue {
  socket: Socket | null;
}

const SocketContext = createContext<SocketContextValue>({ socket: null });

export function useSocket(): SocketContextValue {
  return useContext(SocketContext);
}

interface Props {
  clientType: "host" | "overlay" | "admin";
  children: React.ReactNode;
  onDrawingEvent?: (event: DrawingEvent) => void;
}

export default function SocketProvider({ clientType, children, onDrawingEvent }: Props) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const onDrawingRef = useRef(onDrawingEvent);
  onDrawingRef.current = onDrawingEvent;

  const setGameState = useGameStore((s) => s.setGameState);

  useEffect(() => {
    const origin = typeof window !== "undefined" ? window.location.origin : "http://localhost:3000";
    const s = io(origin, {
      query: { type: clientType },
      transports: ["websocket", "polling"],
    });

    s.on("game:state", (state: GameState) => {
      setGameState(state);
    });

    s.on("game:winner", (data: {
      nickname: string;
      earnedScore: number;
      answer: string;
      scoreboard: GameState["scoreboard"];
    }) => {
      setGameState({
        recentWinner: {
          nickname: data.nickname,
          earnedScore: data.earnedScore,
          score: 0,
          correctCount: 0,
        },
        scoreboard: data.scoreboard,
      });
    });

    s.on("game:wrongAnswer", (wa: WrongAnswer) => {
      useGameStore.getState().addWrongAnswer(wa);
    });

    s.on("drawing:update", (event: DrawingEvent) => {
      onDrawingRef.current?.(event);
    });

    s.on("drawing:sync", (data: { paths: DrawingEvent["paths"] }) => {
      onDrawingRef.current?.({ type: "sync", paths: data.paths });
    });

    s.on("timer:tick", ({ timeLeft }: { timeLeft: number }) => {
      useGameStore.setState({ timeLeft });
    });

    setSocket(s);

    return () => {
      s.disconnect();
      setSocket(null);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientType]);

  return (
    <SocketContext.Provider value={{ socket }}>
      {children}
    </SocketContext.Provider>
  );
}
