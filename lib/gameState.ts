import type { GameState } from "@/types/game";
import { DEFAULT_TIME_LIMIT, DEFAULT_BASE_SCORE } from "./constants";

export function createInitialGameState(): GameState {
  return {
    roundNumber: 0,
    roundStatus: "idle",
    currentAnswer: "",
    currentHint: "",
    timeLimit: DEFAULT_TIME_LIMIT,
    timeLeft: DEFAULT_TIME_LIMIT,
    baseScore: DEFAULT_BASE_SCORE,
    hintLevel: 0,
    isAnswerRevealed: false,
    recentWinner: undefined,
    scoreboard: [],
    recentWrongAnswers: [],
    settings: {
      defaultTimeLimit: DEFAULT_TIME_LIMIT,
      defaultBaseScore: DEFAULT_BASE_SCORE,
      useHint: true,
      showWrongAnswers: true,
      rankingDisplayCount: 10,
      hintScorePenalty: false,
    },
  };
}
