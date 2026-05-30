import fs from "fs";
import path from "path";
import type { GameData, GameSettings } from "@/types/game";

const DATA_DIR = path.join(process.cwd(), "data");
const GAME_DATA_FILE = path.join(DATA_DIR, "game-data.json");
const SETTINGS_FILE = path.join(DATA_DIR, "settings.json");

const DEFAULT_SETTINGS: GameSettings = {
  defaultTimeLimit: 60,
  defaultBaseScore: 100,
  useHint: true,
  showWrongAnswers: true,
  rankingDisplayCount: 10,
  hintScorePenalty: false,
};

const DEFAULT_GAME_DATA: GameData = {
  players: [],
  rounds: [],
  settings: DEFAULT_SETTINGS,
};

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

export function loadGameData(): GameData {
  ensureDataDir();
  try {
    if (fs.existsSync(GAME_DATA_FILE)) {
      const raw = fs.readFileSync(GAME_DATA_FILE, "utf-8");
      return JSON.parse(raw) as GameData;
    }
  } catch {
    // fall through to default
  }
  return structuredClone(DEFAULT_GAME_DATA);
}

export function saveGameData(data: GameData): void {
  ensureDataDir();
  fs.writeFileSync(GAME_DATA_FILE, JSON.stringify(data, null, 2), "utf-8");
}

export function loadSettings(): GameSettings {
  ensureDataDir();
  try {
    if (fs.existsSync(SETTINGS_FILE)) {
      const raw = fs.readFileSync(SETTINGS_FILE, "utf-8");
      return { ...DEFAULT_SETTINGS, ...(JSON.parse(raw) as Partial<GameSettings>) };
    }
  } catch {
    // fall through to default
  }
  return structuredClone(DEFAULT_SETTINGS);
}

export function saveSettings(settings: GameSettings): void {
  ensureDataDir();
  fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2), "utf-8");
}
