"use client";

interface Props {
  timeLeft: number;
  timeLimit: number;
  large?: boolean;
}

export default function Timer({ timeLeft, timeLimit, large = false }: Props) {
  const ratio = timeLimit > 0 ? timeLeft / timeLimit : 0;
  const isLow = timeLeft <= 10 && timeLeft > 0;
  const isDanger = timeLeft <= 5 && timeLeft > 0;

  const color = isDanger ? "#ff006e" : isLow ? "#ffbe0b" : "#00f5ff";

  const circumference = 2 * Math.PI * 40;
  const strokeDashoffset = circumference * (1 - ratio);

  return (
    <div className={`flex flex-col items-center gap-1 ${large ? "scale-150" : ""}`}>
      <div className="relative flex h-24 w-24 items-center justify-center">
        <svg className="absolute -rotate-90" width="96" height="96">
          <circle
            cx="48"
            cy="48"
            r="40"
            fill="none"
            stroke="#2a2a3e"
            strokeWidth="6"
          />
          <circle
            cx="48"
            cy="48"
            r="40"
            fill="none"
            stroke={color}
            strokeWidth="6"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            style={{
              transition: "stroke-dashoffset 0.9s linear, stroke 0.3s",
              filter: `drop-shadow(0 0 6px ${color})`,
            }}
          />
        </svg>
        <span
          className="text-2xl font-bold tabular-nums"
          style={{ color, textShadow: `0 0 10px ${color}` }}
        >
          {timeLeft}
        </span>
      </div>
      {isLow && (
        <span
          className="animate-pulse text-xs font-bold"
          style={{ color }}
        >
          {isDanger ? "⚠ 시간 부족!" : "빨리!"}
        </span>
      )}
    </div>
  );
}
