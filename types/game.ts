export type RoundStatus = "idle" | "ready" | "playing" | "ended";

export interface PlayerScore {
  nickname: string;
  score: number;
  correctCount: number;
  lastCorrectAt?: string;
}

export interface WrongAnswer {
  nickname: string;
  answer: string;
  submittedAt: string;
}

export interface RoundRecord {
  roundNumber: number;
  answer: string;
  winner?: string;
  winnerScore?: number;
  duration: number;
  startedAt: string;
  endedAt: string;
}

export interface GameSettings {
  defaultTimeLimit: number;
  defaultBaseScore: number;
  useHint: boolean;
  showWrongAnswers: boolean;
  rankingDisplayCount: number;
  hintScorePenalty: boolean;
}

export interface GameState {
  roundNumber: number;
  roundStatus: RoundStatus;
  currentAnswer: string;
  currentHint: string;
  timeLimit: number;
  timeLeft: number;
  baseScore: number;
  hintLevel: number;
  isAnswerRevealed: boolean;
  recentWinner?: PlayerScore & { earnedScore: number };
  scoreboard: PlayerScore[];
  recentWrongAnswers: WrongAnswer[];
  settings: GameSettings;
}

export interface GameData {
  players: PlayerScore[];
  rounds: RoundRecord[];
  settings: GameSettings;
}
