import { PlayerType } from "@/types";
import type { AiDifficultyByPlayer } from "@/helpers/aiDifficulty";
import { gameModeFromPlayers } from "@/helpers/analytics";
import { getApiUrl } from "@/helpers/requests";
import { squareFromPieceIndex } from "@/helpers/gameplay";

export type GameLogSession = {
  gameMoves: string;
  thinkMs: number[];
  aiSnapshot: [number, number] | null;
};

export function createGameLogSession(): GameLogSession {
  return { gameMoves: "", thinkMs: [], aiSnapshot: null };
}

export function gameModeCode(typeA: PlayerType, typeB: PlayerType): number {
  const mode = gameModeFromPlayers(typeA, typeB);
  switch (mode) {
    case "vs human":
      return 0;
    case "vs ai":
      return 1;
    case "vs remote":
      return 2;
    case "ai vs ai":
      return 3;
  }
}

function aiDifficultyCode(
  playerType: PlayerType,
  seat: 0 | 1,
  levels: AiDifficultyByPlayer
): number {
  if (playerType !== PlayerType.AI) return 0;
  return levels[seat] === "hard" ? 2 : 1;
}

export function snapshotAiDifficulties(
  log: GameLogSession,
  typeA: PlayerType,
  typeB: PlayerType,
  levels: AiDifficultyByPlayer
) {
  if (log.aiSnapshot != null) return;
  log.aiSnapshot = [
    aiDifficultyCode(typeA, 0, levels),
    aiDifficultyCode(typeB, 1, levels),
  ];
}

export function appendGameLogPly(
  log: GameLogSession,
  pieceIndex: number,
  thinkMs: number
) {
  log.gameMoves += squareFromPieceIndex(pieceIndex);
  log.thinkMs.push(Math.min(3_600_000, Math.max(0, Math.round(thinkMs))));
}

export function dropGameLogPlies(log: GameLogSession, plies: number) {
  if (plies <= 0) return;
  const keep = Math.max(0, log.thinkMs.length - plies);
  log.thinkMs = log.thinkMs.slice(0, keep);
  log.gameMoves = log.gameMoves.slice(0, keep * 2);
}

export type GameLogPayload = {
  v: 1;
  id: string;
  m: number;
  g: string;
  s: [number, number];
  w: number;
  a: [number, number];
  t?: number[];
};

function allThinkZero(t: number[]) {
  return t.every((ms) => ms === 0);
}

export function buildGameLogPayload(input: {
  log: GameLogSession;
  mode: number;
  blackScore: number;
  whiteScore: number;
  winner: number;
}): GameLogPayload {
  const a = input.log.aiSnapshot ?? [0, 0];
  const payload: GameLogPayload = {
    v: 1,
    id: crypto.randomUUID(),
    m: input.mode,
    g: input.log.gameMoves,
    s: [input.blackScore, input.whiteScore],
    w: input.winner,
    a,
  };
  if (!allThinkZero(input.log.thinkMs)) {
    payload.t = input.log.thinkMs;
  }
  return payload;
}

export function submitGameLog(payload: GameLogPayload) {
  void fetch(getApiUrl("/games"), {
    method: "POST",
    keepalive: true,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  }).catch(() => {});
}
