"use client";
import { useEffect, useState } from "react";

interface Props {
  nickname: string;
  earnedScore: number;
  answer: string;
  onClose?: () => void;
}

export default function WinnerPopup({ nickname, earnedScore, answer, onClose }: Props) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => {
      setVisible(false);
      onClose?.();
    }, 5000);
    return () => clearTimeout(t);
  }, [onClose]);

  if (!visible) return null;

  return (
    <div className="animate-winner-pop pointer-events-none fixed inset-0 z-50 flex items-center justify-center">
      <div className="relative rounded-2xl border-2 border-[#00ff88] bg-[#0a0a0f]/95 p-8 text-center shadow-2xl"
        style={{ boxShadow: "0 0 40px #00ff88, 0 0 80px #00ff8844" }}
      >
        {/* Celebration */}
        <div className="mb-2 text-4xl">🎉</div>
        <div className="text-lg text-gray-400">정답!</div>
        <div
          className="my-2 text-3xl font-black tracking-wide"
          style={{ color: "#00f5ff", textShadow: "0 0 20px #00f5ff, 0 0 40px #00f5ff" }}
        >
          {nickname}
        </div>
        <div
          className="my-1 text-5xl font-black"
          style={{ color: "#ffbe0b", textShadow: "0 0 20px #ffbe0b" }}
        >
          +{earnedScore}점
        </div>
        <div className="mt-3 rounded-lg bg-[#1a1a26] px-4 py-2 text-sm text-gray-300">
          정답: <span className="font-bold text-[#00ff88]">{answer}</span>
        </div>
        {/* Progress bar countdown */}
        <div className="mt-4 h-1 w-full overflow-hidden rounded-full bg-[#2a2a3e]">
          <div
            className="h-full rounded-full bg-[#00ff88]"
            style={{ animation: "shrink 5s linear forwards" }}
          />
        </div>
      </div>
      <style>{`
        @keyframes shrink { from { width: 100%; } to { width: 0%; } }
        @keyframes winnerPop {
          0% { opacity: 0; transform: scale(0.5) translateY(-20px); }
          100% { opacity: 1; transform: scale(1) translateY(0); }
        }
        .animate-winner-pop > div { animation: winnerPop 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275); }
      `}</style>
    </div>
  );
}
