"use client";
import { useState } from "react";
import type { Socket } from "socket.io-client";
import type { RoundStatus } from "@/types/game";
import { getKoreanInitials } from "@/lib/koreanHint";
import { DEFAULT_BASE_SCORE, DEFAULT_TIME_LIMIT } from "@/lib/constants";

interface Props {
  socket: Socket | null;
  roundStatus: RoundStatus;
  currentAnswer: string;
  currentHint: string;
  timeLeft: number;
  timeLimit: number;
}

export default function GameControlPanel({
  socket,
  roundStatus,
  currentAnswer,
  currentHint,
  timeLeft,
  timeLimit,
}: Props) {
  const [answer, setAnswer] = useState("");
  const [hint, setHint] = useState("");
  const [tl, setTl] = useState(DEFAULT_TIME_LIMIT);
  const [score, setScore] = useState(DEFAULT_BASE_SCORE);

  const isPlaying = roundStatus === "playing";
  const isEnded = roundStatus === "ended";

  function autoHint() {
    if (!answer.trim()) return;
    setHint(getKoreanInitials(answer.trim()));
  }

  function startRound() {
    if (!answer.trim() || !socket) return;
    socket.emit("host:startRound", {
      answer: answer.trim(),
      hint: hint.trim(),
      timeLimit: tl,
      baseScore: score,
    });
  }

  function endRound() {
    socket?.emit("host:endRound");
  }

  function skipRound() {
    socket?.emit("host:skipRound");
  }

  function revealAnswer() {
    socket?.emit("host:revealAnswer");
  }

  function clearCanvas() {
    socket?.emit("host:clearCanvas");
  }

  return (
    <div className="card flex flex-col gap-3">
      <h3 className="text-sm font-bold text-[#00f5ff]">🎮 라운드 설정</h3>

      {/* Answer input */}
      <div className="flex flex-col gap-1">
        <label className="text-xs text-gray-400">제시어 *</label>
        <input
          className="input-field"
          placeholder="예: 고양이"
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          disabled={isPlaying}
        />
      </div>

      {/* Hint input */}
      <div className="flex flex-col gap-1">
        <label className="text-xs text-gray-400">힌트</label>
        <div className="flex gap-2">
          <input
            className="input-field flex-1"
            placeholder="빈칸 시 자동 초성 힌트"
            value={hint}
            onChange={(e) => setHint(e.target.value)}
            disabled={isPlaying}
          />
          <button
            onClick={autoHint}
            disabled={isPlaying || !answer.trim()}
            className="btn-secondary whitespace-nowrap px-3 py-2 text-sm"
          >
            초성 자동
          </button>
        </div>
      </div>

      {/* Time / Score */}
      <div className="flex gap-3">
        <div className="flex flex-1 flex-col gap-1">
          <label className="text-xs text-gray-400">제한 시간(초)</label>
          <input
            type="number"
            className="input-field"
            min={10}
            max={300}
            value={tl}
            onChange={(e) => setTl(Number(e.target.value))}
            disabled={isPlaying}
          />
        </div>
        <div className="flex flex-1 flex-col gap-1">
          <label className="text-xs text-gray-400">기본 점수</label>
          <input
            type="number"
            className="input-field"
            min={10}
            step={10}
            value={score}
            onChange={(e) => setScore(Number(e.target.value))}
            disabled={isPlaying}
          />
        </div>
      </div>

      {/* Control buttons */}
      <div className="flex flex-wrap gap-2">
        {!isPlaying ? (
          <button
            onClick={startRound}
            disabled={!answer.trim()}
            className="btn-primary flex-1"
          >
            ▶ 라운드 시작
          </button>
        ) : (
          <>
            <button onClick={endRound} className="btn-danger flex-1">⏹ 종료</button>
            <button onClick={skipRound} className="btn-secondary px-3">스킵</button>
            <button onClick={revealAnswer} className="btn-secondary px-3">정답 공개</button>
          </>
        )}
        <button onClick={clearCanvas} className="btn-secondary px-3">
          🖌 지우기
        </button>
      </div>

      {/* Status display */}
      {isPlaying && (
        <div className="rounded-lg bg-[#0a0a0f] p-3 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-gray-400">현재 정답:</span>
            <span className="font-bold text-[#00ff88]">{currentAnswer}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-gray-400">힌트:</span>
            <span className="text-[#ffbe0b]">{currentHint || "없음"}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-gray-400">남은 시간:</span>
            <span className={`font-bold tabular-nums ${timeLeft <= 10 ? "text-[#ff006e]" : "text-white"}`}>
              {timeLeft}s / {timeLimit}s
            </span>
          </div>
        </div>
      )}
      {isEnded && (
        <div className="rounded-lg border border-[#2a2a3e] p-3 text-center text-sm text-gray-400">
          라운드 종료. 새 제시어를 입력하고 시작하세요.
        </div>
      )}
    </div>
  );
}
