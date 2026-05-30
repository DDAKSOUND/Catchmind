export interface ChatMessage {
  nickname: string;
  message: string;
  timestamp: string;
  source: "mock" | "soop";
}

export interface JudgeResult {
  isCommand: boolean;
  isCorrect: boolean;
  extractedAnswer?: string;
  normalizedAnswer?: string;
}
