"use client";
import { create } from "zustand";
import type { GameState, WrongAnswer } from "@/types/game";
import { createInitialGameState } from "./gameState";

interface GameStore extends GameState {
  setGameState: (state: Partial<GameState>) => void;
  addWrongAnswer: (wa: WrongAnswer) => void;
}

export const useGameStore = create<GameStore>((set) => ({
  ...createInitialGameState(),
  setGameState: (partial) => set((prev) => ({ ...prev, ...partial })),
  addWrongAnswer: (wa) =>
    set((prev) => ({
      recentWrongAnswers: [wa, ...prev.recentWrongAnswers.slice(0, 19)],
    })),
}));
