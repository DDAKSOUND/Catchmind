"use client";
import type { WrongAnswer } from "@/types/game";

interface Props {
  wrongAnswers: WrongAnswer[];
  maxCount?: number;
}

export default function RecentWrongAnswers({ wrongAnswers, maxCount = 10 }: Props) {
  const recent = wrongAnswers.slice(0, maxCount);

  return (
    <div className="card flex flex-col gap-1">
      <h3 className="mb-1 text-sm font-bold text-[#ff006e]">❌ 최근 오답</h3>
      {recent.length === 0 && (
        <p className="text-xs text-gray-500">오답이 없습니다.</p>
      )}
      {recent.map((wa, idx) => (
        <div key={idx} className="flex items-center gap-2 rounded px-1 py-0.5">
          <span className="max-w-[80px] truncate text-xs text-gray-400">{wa.nickname}</span>
          <span className="text-xs font-medium text-[#ff6666]">{wa.answer}</span>
        </div>
      ))}
    </div>
  );
}
