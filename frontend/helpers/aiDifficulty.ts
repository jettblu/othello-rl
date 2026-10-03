import { AI_SIMULATIONS, type AiDifficulty } from "@/constants/ai";

const LEGACY_KEY = "othello-ai-difficulty";
const KEY_A = "othello-ai-difficulty-a";
const KEY_B = "othello-ai-difficulty-b";
const DESKTOP_MQ = "(min-width: 768px)";

export type AiDifficultyByPlayer = Record<0 | 1, AiDifficulty>;

function defaultForDesktop(): AiDifficulty {
  if (typeof window === "undefined") return "easy";
  const desktop = window.matchMedia?.(DESKTOP_MQ).matches ?? false;
  const lowCore =
    navigator.hardwareConcurrency > 0 && navigator.hardwareConcurrency <= 4;
  return desktop && !lowCore ? "hard" : "easy";
}

function readStored(key: string): AiDifficulty | null {
  const v = localStorage.getItem(key);
  return v === "easy" || v === "hard" ? v : null;
}

/** Load per-player levels; migrates the old single-key preference. */
export function loadAiDifficultyByPlayer(): AiDifficultyByPlayer {
  const fallback = defaultForDesktop();
  const legacy = readStored(LEGACY_KEY);
  const a = readStored(KEY_A) ?? legacy ?? fallback;
  const b = readStored(KEY_B) ?? legacy ?? fallback;
  return { 0: a, 1: b };
}

export function persistAiDifficulty(player: 0 | 1, level: AiDifficulty) {
  localStorage.setItem(player === 0 ? KEY_A : KEY_B, level);
}

export function simulationsFor(player: 0 | 1, levels: AiDifficultyByPlayer) {
  return AI_SIMULATIONS[levels[player]];
}
