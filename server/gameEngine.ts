import { judgeAnswer } from "@/lib/answerJudge";
import { addScore, calculateScore } from "@/lib/score";
import { loadGameData, saveGameData } from "@/lib/storage";
import { createInitialGameState } from "@/lib/gameState";
import type { GameState, WrongAnswer, RoundRecord } from "@/types/game";
import type { ChatMessage } from "@/types/chat";

export type GameEventCallback = (event: string, data?: unknown) => void;

export class GameEngine {
  private state: GameState;
  private timerInterval: ReturnType<typeof setInterval> | null = null;
  private emit: GameEventCallback;
  private roundStartedAt: string | null = null;

  constructor(emitFn: GameEventCallback) {
    this.emit = emitFn;
    this.state = createInitialGameState();
    // Load persisted players
    const data = loadGameData();
    this.state.scoreboard = data.players;
    this.state.settings = data.settings;
  }

  getState(): GameState {
    return this.state;
  }

  getPublicState(): Omit<GameState, "currentAnswer"> & { currentAnswer: string } {
    // Never expose the answer to overlay clients - handled at socket layer
    return this.state;
  }

  startRound(params: {
    answer: string;
    hint: string;
    timeLimit: number;
    baseScore: number;
  }): void {
    if (!params.answer.trim()) return;

    this.stopTimer();
    this.roundStartedAt = new Date().toISOString();

    this.state = {
      ...this.state,
      roundNumber: this.state.roundNumber + 1,
      roundStatus: "playing",
      currentAnswer: params.answer.trim(),
      currentHint: params.hint.trim(),
      timeLimit: params.timeLimit,
      timeLeft: params.timeLimit,
      baseScore: params.baseScore,
      hintLevel: 0,
      isAnswerRevealed: false,
      recentWinner: undefined,
      recentWrongAnswers: [],
    };

    this.emit("game:state", this.state);
    this.startTimer();
  }

  endRound(): void {
    this.stopTimer();
    this.state.roundStatus = "ended";
    this.state.isAnswerRevealed = true;
    this.persistRound(false);
    this.emit("game:roundEnded", {
      answer: this.state.currentAnswer,
      winner: this.state.recentWinner,
    });
    this.emit("game:state", this.state);
  }

  skipRound(): void {
    this.endRound();
  }

  revealAnswer(): void {
    this.state.isAnswerRevealed = true;
    this.emit("game:state", this.state);
  }

  processChat(message: ChatMessage): void {
    if (this.state.roundStatus !== "playing") return;
    if (this.state.recentWinner) return;

    const result = judgeAnswer(message.message, this.state.currentAnswer);

    if (!result.isCommand) return;

    if (result.isCorrect) {
      const earnedScore = calculateScore(this.state.baseScore, this.state.hintLevel);
      this.state.scoreboard = addScore(
        this.state.scoreboard,
        message.nickname,
        earnedScore
      );
      const winner = this.state.scoreboard.find(
        (p) => p.nickname === message.nickname
      )!;
      this.state.recentWinner = { ...winner, earnedScore };
      this.state.roundStatus = "ended";
      this.state.isAnswerRevealed = true;

      this.stopTimer();
      this.persistRound(true);
      this.persistScores();

      this.emit("game:winner", {
        nickname: message.nickname,
        earnedScore,
        answer: this.state.currentAnswer,
        scoreboard: this.state.scoreboard,
      });
      this.emit("game:state", this.state);
    } else {
      const wrong: WrongAnswer = {
        nickname: message.nickname,
        answer: result.extractedAnswer ?? "",
        submittedAt: message.timestamp,
      };
      this.state.recentWrongAnswers = [
        wrong,
        ...this.state.recentWrongAnswers.slice(0, 19),
      ];
      this.emit("game:wrongAnswer", wrong);
      this.emit("game:state", this.state);
    }
  }

  updateSettings(settings: Partial<GameState["settings"]>): void {
    this.state.settings = { ...this.state.settings, ...settings };
    const data = loadGameData();
    data.settings = this.state.settings;
    saveGameData(data);
    this.emit("game:state", this.state);
  }

  resetScores(): void {
    this.state.scoreboard = [];
    const data = loadGameData();
    data.players = [];
    saveGameData(data);
    this.emit("game:state", this.state);
  }

  private startTimer(): void {
    this.timerInterval = setInterval(() => {
      if (this.state.roundStatus !== "playing") {
        this.stopTimer();
        return;
      }
      this.state.timeLeft = Math.max(0, this.state.timeLeft - 1);
      this.emit("timer:tick", { timeLeft: this.state.timeLeft });

      // 힌트가 설정되어 있고 아직 공개 안 됐을 때, 60초 남으면 자동 공개
      if (
        this.state.timeLeft === 60 &&
        this.state.hintLevel === 0 &&
        this.state.currentHint.trim() &&
        this.state.settings.useHint
      ) {
        this.state.hintLevel = 1;
        this.emit("game:state", this.state);
      }

      if (this.state.timeLeft <= 0) {
        this.stopTimer();
        this.endRound();
      }
    }, 1000);
  }

  private stopTimer(): void {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }

  private persistRound(hasWinner: boolean): void {
    const data = loadGameData();
    const record: RoundRecord = {
      roundNumber: this.state.roundNumber,
      answer: this.state.currentAnswer,
      winner: hasWinner ? this.state.recentWinner?.nickname : undefined,
      winnerScore: hasWinner ? this.state.recentWinner?.earnedScore : undefined,
      duration: this.state.timeLimit - this.state.timeLeft,
      startedAt: this.roundStartedAt ?? new Date().toISOString(),
      endedAt: new Date().toISOString(),
    };
    data.rounds = [record, ...data.rounds.slice(0, 99)];
    saveGameData(data);
  }

  private persistScores(): void {
    const data = loadGameData();
    data.players = this.state.scoreboard;
    saveGameData(data);
  }
}
