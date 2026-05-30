export const DEFAULT_TIME_LIMIT = 180;
export const DEFAULT_BASE_SCORE = 100;
export const DEFAULT_RANKING_COUNT = 10;
export const ANSWER_COMMAND_PREFIX = "!정답";

export const HINT_SCORE_MULTIPLIERS = [1.0, 0.7, 0.5, 0.3];

export const COLORS = [
  "#ffffff",
  "#ff0000",
  "#ff6600",
  "#ffff00",
  "#00ff00",
  "#00ffff",
  "#0066ff",
  "#ff00ff",
  "#ff69b4",
  "#8b4513",
  "#000000",
];

export const PEN_SIZES = [2, 4, 8, 12, 20, 32];

export const SOUND_EVENTS = {
  ROUND_START: "/sounds/round-start.mp3",
  CORRECT: "/sounds/correct.mp3",
  WRONG: "/sounds/wrong.mp3",
  ROUND_END: "/sounds/round-end.mp3",
  TIME_LOW: "/sounds/time-low.mp3",
} as const;
