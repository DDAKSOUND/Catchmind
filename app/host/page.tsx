"use client";
import { useRef, useCallback } from "react";
import SocketProvider, { useSocket } from "@/components/SocketProvider";
import DrawingCanvas from "@/components/DrawingCanvas";
import GameControlPanel from "@/components/GameControlPanel";
import MockChatInput from "@/components/MockChatInput";
import ScoreBoard from "@/components/ScoreBoard";
import RecentWrongAnswers from "@/components/RecentWrongAnswers";
import Timer from "@/components/Timer";
import WinnerPopup from "@/components/WinnerPopup";
import { useGameStore } from "@/lib/useGameStore";
import type { DrawingEvent } from "@/types/drawing";
import Link from "next/link";

function HostInner() {
  const { socket } = useSocket();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const state = useGameStore();

  const handleDrawingEvent = useCallback((event: DrawingEvent) => {
    socket?.emit("drawing:update", event);
  }, [socket]);

  const handleRemoteDrawing = useCallback((event: DrawingEvent) => {
    // Host doesn't need remote drawing (it's the source)
    void event;
  }, []);

  const roundStatusLabel: Record<string, string> = {
    idle: "대기 중",
    ready: "준비 완료",
    playing: "진행 중",
    ended: "종료",
  };

  const statusColors: Record<string, string> = {
    idle: "#666",
    ready: "#ffbe0b",
    playing: "#00ff88",
    ended: "#ff006e",
  };

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-[#0a0a0f]">
      {/* Header */}
      <header className="flex items-center justify-between border-b border-[#2a2a3e] px-4 py-2">
        <div className="flex items-center gap-3">
          <span className="text-lg font-black text-[#00f5ff]" style={{ textShadow: "0 0 10px #00f5ff" }}>
            🎨 캐치마인드 Host
          </span>
          <span
            className="rounded-full px-2 py-0.5 text-xs font-bold"
            style={{
              color: statusColors[state.roundStatus],
              backgroundColor: `${statusColors[state.roundStatus]}22`,
              border: `1px solid ${statusColors[state.roundStatus]}`,
            }}
          >
            {roundStatusLabel[state.roundStatus]} · R{state.roundNumber}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/overlay" target="_blank" className="rounded border border-[#2a2a3e] px-3 py-1 text-xs text-gray-400 hover:text-[#00f5ff]">
            Overlay →
          </Link>
          <Link href="/admin" className="rounded border border-[#2a2a3e] px-3 py-1 text-xs text-gray-400 hover:text-[#ffbe0b]">
            Admin
          </Link>
        </div>
      </header>

      {/* Main */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left panel */}
        <aside className="flex w-64 flex-shrink-0 flex-col gap-3 overflow-y-auto border-r border-[#2a2a3e] p-3">
          <GameControlPanel
            socket={socket}
            roundStatus={state.roundStatus}
            currentAnswer={state.currentAnswer}
            currentHint={state.currentHint}
            timeLeft={state.timeLeft}
            timeLimit={state.timeLimit}
          />
        </aside>

        {/* Canvas */}
        <main className="flex flex-1 flex-col items-center justify-center gap-3 p-4">
          {state.roundStatus === "playing" && (
            <div className="flex items-center gap-4">
              <Timer timeLeft={state.timeLeft} timeLimit={state.timeLimit} />
              <div className="text-sm text-gray-400">
                힌트:{" "}
                <span className="font-bold text-[#ffbe0b]">
                  {state.currentHint || "없음"}
                </span>
              </div>
            </div>
          )}
          <DrawingCanvas
            onEvent={handleDrawingEvent}
            width={800}
            height={560}
          />
        </main>

        {/* Right panel */}
        <aside className="flex w-64 flex-shrink-0 flex-col gap-3 overflow-y-auto border-l border-[#2a2a3e] p-3">
          {/* Recent winner */}
          {state.recentWinner && (
            <div className="card border-[#00ff88] bg-[#001a0d]">
              <p className="text-xs text-gray-400">최근 정답자</p>
              <p className="font-bold text-[#00ff88]">{state.recentWinner.nickname}</p>
              <p className="text-sm text-[#ffbe0b]">+{state.recentWinner.earnedScore}점</p>
            </div>
          )}
          <MockChatInput socket={socket} />
          <ScoreBoard scoreboard={state.scoreboard} maxCount={10} highlight={state.recentWinner?.nickname} />
          <RecentWrongAnswers wrongAnswers={state.recentWrongAnswers} />
        </aside>
      </div>

      {/* Winner popup */}
      {state.recentWinner && state.roundStatus === "ended" && (
        <WinnerPopup
          nickname={state.recentWinner.nickname}
          earnedScore={state.recentWinner.earnedScore}
          answer={state.currentAnswer}
        />
      )}
    </div>
  );
}

export default function HostPage() {
  const drawingEventHandlersRef = useRef<((e: DrawingEvent) => void)[]>([]);

  return (
    <SocketProvider
      clientType="host"
      onDrawingEvent={(e) => drawingEventHandlersRef.current.forEach((h) => h(e))}
    >
      <HostInner />
    </SocketProvider>
  );
}
