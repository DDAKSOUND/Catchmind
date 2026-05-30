"use client";
import type { PlayerScore } from "@/types/game";

interface Props {
  scoreboard: PlayerScore[];
  maxCount?: number;
  highlight?: string;
}

const RANK_COLORS = ["#ffbe0b", "#c0c0c0", "#cd7f32"];
const RANK_LABELS = ["1st", "2nd", "3rd"];

export default function ScoreBoard({ scoreboard, maxCount = 10, highlight }: Props) {
  const top = scoreboard.slice(0, maxCount);

  return (
    <div className="card flex flex-col gap-1">
      <h3 className="mb-2 text-sm font-bold text-[#00f5ff]">🏆 랭킹</h3>
      {top.length === 0 && (
        <p className="text-xs text-gray-500">아직 정답자가 없습니다.</p>
      )}
      {top.map((player, idx) => {
        const isWinner = idx < 3;
        const isHighlight = player.nickname === highlight;
        return (
          <div
            key={player.nickname}
            className={`flex items-center gap-2 rounded-lg px-2 py-1.5 transition-all ${
              isHighlight ? "bg-[#00f5ff22] ring-1 ring-[#00f5ff]" : "hover:bg-[#2a2a3e]"
            }`}
          >
            <span
              className="w-8 text-center text-xs font-bold"
              style={{ color: isWinner ? RANK_COLORS[idx] : "#666", textShadow: isWinner ? `0 0 8px ${RANK_COLORS[idx]}` : "none" }}
            >
              {isWinner ? RANK_LABELS[idx] : `${idx + 1}`}
            </span>
            <span className="flex-1 truncate text-sm font-medium">{player.nickname}</span>
            <span className="text-xs text-gray-400">✓{player.correctCount}</span>
            <span
              className="min-w-[50px] text-right text-sm font-bold tabular-nums"
              style={{ color: isWinner ? RANK_COLORS[idx] : "#e0e0e0" }}
            >
              {player.score.toLocaleString()}
            </span>
          </div>
        );
      })}
    </div>
  );
}
