/** Cache-bust path for public/othello-ai/<version>/. */
export const AI_ASSET_VERSION = "10";

export const POSITION_CACHE_LIMIT = 64;

/** MCTS sims for AI move selection (play profile + tree reuse). */
export const AI_SIMULATIONS = {
  easy: 8,
  hard: 32,
} as const;

/** Ponder / details overlay: full legal root, retained tree (min budget). */
export const PONDER_SIMULATIONS = 32;

export type AiDifficulty = keyof typeof AI_SIMULATIONS;
