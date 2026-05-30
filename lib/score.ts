import { HINT_SCORE_MULTIPLIERS } from "./constants";
import type { PlayerScore } from "@/types/game";

export function calculateScore(baseScore: number, hintLevel: number): number {
  const multiplier = HINT_SCORE_MULTIPLIERS[hintLevel] ?? HINT_SCORE_MULTIPLIERS[HINT_SCORE_MULTIPLIERS.length - 1];
  return Math.round(baseScore * multiplier);
}

export function addScore(
  scoreboard: PlayerScore[],
  nickname: string,
  score: number
): PlayerScore[] {
  const existing = scoreboard.find((p) => p.nickname === nickname);
  if (existing) {
    return scoreboard
      .map((p) =>
        p.nickname === nickname
          ? {
              ...p,
              score: p.score + score,
              correctCount: p.correctCount + 1,
              lastCorrectAt: new Date().toISOString(),
            }
          : p
      )
      .sort((a, b) => b.score - a.score);
  }
  return [
    ...scoreboard,
    {
      nickname,
      score,
      correctCount: 1,
      lastCorrectAt: new Date().toISOString(),
    },
  ].sort((a, b) => b.score - a.score);
}

export function sortScoreboard(scoreboard: PlayerScore[]): PlayerScore[] {
  return [...scoreboard].sort((a, b) => b.score - a.score);
}
