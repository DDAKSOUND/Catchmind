import { ANSWER_COMMAND_PREFIX } from "./constants";
import type { JudgeResult } from "@/types/chat";

export function normalizeAnswer(text: string): string {
  return text
    .trim()
    .replace(/\s/g, "")
    .replace(/[^\w가-힣]/g, "")
    .toLowerCase();
}

export function extractAnswerFromCommand(message: string): string | null {
  const trimmed = message.trim();

  if (!trimmed.startsWith(ANSWER_COMMAND_PREFIX)) {
    return null;
  }

  const answer = trimmed.slice(ANSWER_COMMAND_PREFIX.length).trim();

  if (!answer) {
    return null;
  }

  return answer;
}

export function judgeAnswer(message: string, correctAnswer: string): JudgeResult {
  const extracted = extractAnswerFromCommand(message);

  if (extracted === null) {
    return {
      isCommand: false,
      isCorrect: false,
    };
  }

  const normalizedAnswer = normalizeAnswer(extracted);
  const normalizedCorrectAnswer = normalizeAnswer(correctAnswer);

  return {
    isCommand: true,
    isCorrect: normalizedAnswer === normalizedCorrectAnswer,
    extractedAnswer: extracted,
    normalizedAnswer,
  };
}
