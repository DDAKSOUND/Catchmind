"use client";
import { useRef, useCallback, useState, useEffect } from "react";
import SocketProvider from "@/components/SocketProvider";
import OverlayCanvas, { applyEventToCanvas } from "@/components/OverlayCanvas";
import Timer from "@/components/Timer";
import ScoreBoard from "@/components/ScoreBoard";
import RecentWrongAnswers from "@/components/RecentWrongAnswers";
import WinnerPopup from "@/components/WinnerPopup";
import { useGameStore } from "@/lib/useGameStore";
import type { DrawingEvent } from "@/types/drawing";

function OverlayInner({ onMount }: { onMount: (canvas: HTMLCanvasElement) => void }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const state = useGameStore();
  const [showWinner, setShowWinner] = useState(false);
  const prevWinnerRef = useRef<string | undefined>(undefined);
  const prevHintLevelRef = useRef(0);
  const [hintJustRevealed, setHintJustRevealed] = useState(false);

  useEffect(() => {
    if (
      state.recentWinner &&
      state.roundStatus === "ended" &&
      state.recentWinner.nickname !== prevWinnerRef.current
    ) {
      prevWinnerRef.current = state.recentWinner.nickname;
      setShowWinner(true);
    }
  }, [state.recentWinner, state.roundStatus]);

  // 힌트가 처음 공개되는 순간 애니메이션 트리거
  useEffect(() => {
    if (state.hintLevel > 0 && prevHintLevelRef.current === 0) {
      setHintJustRevealed(true);
      const timer = setTimeout(() => setHintJustRevealed(false), 2500);
      return () => clearTimeout(timer);
    }
    prevHintLevelRef.current = state.hintLevel;
  }, [state.hintLevel]);

  useEffect(() => {
    const canvas = containerRef.current?.querySelector("canvas");
    if (canvas) onMount(canvas);
  });

  const isPlaying = state.roundStatus === "playing";
  const isEnded = state.roundStatus === "ended";

  return (
    <div
      className="relative overflow-hidden bg-[#0a0a0f]"
      style={{ width: "100vw", height: "100vh" }}
    >
      {/* Background grid */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage:
            "linear-gradient(#00f5ff 1px, transparent 1px), linear-gradient(90deg, #00f5ff 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />

      {/* Top bar */}
      <div className="absolute left-0 right-0 top-0 z-10 flex items-center justify-between border-b border-[#2a2a3e]/80 bg-[#0a0a0f]/90 px-8 py-3 backdrop-blur-sm">
        <div className="flex items-center gap-4">
          <span
            className="text-2xl font-black text-[#00f5ff]"
            style={{ textShadow: "0 0 15px #00f5ff" }}
          >
            🎨 캐치마인드
          </span>
          <span className="text-sm text-gray-500">라운드 {state.roundNumber}</span>
        </div>
        <div className="flex items-center gap-6">
          {isPlaying && (
            <div className="text-lg text-gray-300">
              힌트:{" "}
              {state.hintLevel >= 1 ? (
                <span
                  className={`font-black text-[#ffbe0b] transition-all duration-500 ${
                    hintJustRevealed ? "scale-125 text-[#fff700]" : ""
                  }`}
                  style={{
                    textShadow: hintJustRevealed
                      ? "0 0 25px #fff700, 0 0 50px #ffbe0b"
                      : "0 0 10px #ffbe0b",
                    letterSpacing: "0.3em",
                    display: "inline-block",
                  }}
                >
                  {state.currentHint || "???"}
                </span>
              ) : (
                <span
                  className="font-black text-gray-600"
                  style={{ letterSpacing: "0.3em" }}
                >
                  ???
                </span>
              )}
            </div>
          )}
          {isPlaying && (
            <Timer timeLeft={state.timeLeft} timeLimit={state.timeLimit} />
          )}
          {!isPlaying && !isEnded && (
            <span className="text-lg text-gray-500">대기 중...</span>
          )}
          {isEnded && !state.recentWinner && (
            <span className="text-lg text-[#ff006e]">시간 초과!</span>
          )}
        </div>
      </div>

      {/* Canvas area */}
      <div className="absolute bottom-20 left-0 right-72 top-16">
        <div ref={containerRef} className="h-full w-full p-3">
          <OverlayCanvas width={1400} height={860} />
        </div>
      </div>

      {/* Right sidebar */}
      <div className="absolute bottom-20 right-0 top-16 w-72 overflow-hidden border-l border-[#2a2a3e]/60 bg-[#0a0a0f]/80 p-3 backdrop-blur-sm">
        <ScoreBoard
          scoreboard={state.scoreboard}
          maxCount={5}
          highlight={state.recentWinner?.nickname}
        />
        <div className="mt-3">
          <RecentWrongAnswers wrongAnswers={state.recentWrongAnswers} maxCount={8} />
        </div>
      </div>

      {/* Bottom bar */}
      <div className="absolute bottom-0 left-0 right-0 z-10 flex items-center justify-between border-t border-[#2a2a3e]/80 bg-[#0a0a0f]/90 px-8 py-3 backdrop-blur-sm">
        <div className="text-base text-gray-400">
          정답 입력:{" "}
          <span className="font-bold text-[#00f5ff]">!정답 [정답]</span>
        </div>
        <div className="flex items-center gap-3">
          {state.recentWrongAnswers.slice(0, 5).map((wa, i) => (
            <span
              key={i}
              className="rounded bg-[#ff006e11] px-2 py-0.5 text-sm text-[#ff6666]"
            >
              ✗ {wa.answer}
            </span>
          ))}
        </div>
        {isEnded && state.isAnswerRevealed && (
          <div className="text-base">
            정답:{" "}
            <span className="font-bold text-[#00ff88]">{state.currentAnswer}</span>
          </div>
        )}
        {isEnded && !state.isAnswerRevealed && <div />}
        {isPlaying && <div />}
      </div>

      {/* 힌트 자동 공개 알림 */}
      {hintJustRevealed && (
        <div
          className="pointer-events-none absolute left-1/2 top-24 z-30 -translate-x-1/2 rounded-xl border border-[#ffbe0b]/40 bg-[#0a0a0f]/90 px-8 py-4 text-center backdrop-blur-sm"
          style={{ boxShadow: "0 0 30px #ffbe0b44" }}
        >
          <p className="text-sm text-gray-400">⏰ 1분 남았습니다!</p>
          <p
            className="mt-1 text-2xl font-black text-[#ffbe0b]"
            style={{ textShadow: "0 0 15px #ffbe0b" }}
          >
            💡 힌트 공개!
          </p>
        </div>
      )}

      {/* Winner popup */}
      {showWinner && state.recentWinner && (
        <WinnerPopup
          nickname={state.recentWinner.nickname}
          earnedScore={state.recentWinner.earnedScore}
          answer={state.currentAnswer}
          onClose={() => setShowWinner(false)}
        />
      )}
    </div>
  );
}

export default function OverlayPage() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const handleDrawingEvent = useCallback((event: DrawingEvent) => {
    applyEventToCanvas(canvasRef.current, event);
  }, []);

  return (
    <SocketProvider clientType="overlay" onDrawingEvent={handleDrawingEvent}>
      <OverlayInner onMount={(c) => { canvasRef.current = c; }} />
    </SocketProvider>
  );
}
