/** Cache-bust path for public/othello-ai/<version>/. */
export const AI_ASSET_VERSION = "6";

export const POSITION_CACHE_LIMIT = 64;

export const AI_SIMULATIONS = {
  easy: 1,
  hard: 16,
} as const;

export type AiDifficulty = keyof typeof AI_SIMULATIONS;
