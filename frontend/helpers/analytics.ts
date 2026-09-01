import { trackEvent } from "fathom-client";
import { PlayerType } from "@/types";

export type GameMode = "vs ai" | "vs human" | "vs remote" | "ai vs ai";

export type GameSession = {
  moves: number;
  humanMoves: number;
  aiMoves: number;
  remoteMoves: number;
  aiThinkMs: number;
  startedTracked: boolean;
  completedTracked: boolean;
};

/**
 * Fathom only stores an event name plus `_value` (cents).
 * Count/score events use dollars-as-units (28 moves → $28.00).
 * `ai think time` uses dollars-as-seconds ($1.23 = 1.23s average).
 */
function cents(n: number) {
  return Math.round(n) * 100;
}

function track(name: string, value?: number) {
  trackEvent(name, value != null ? { _value: value } : undefined);
}

export function createGameSession(): GameSession {
  return {
    moves: 0,
    humanMoves: 0,
    aiMoves: 0,
    remoteMoves: 0,
    aiThinkMs: 0,
    startedTracked: false,
    completedTracked: false,
  };
}

export function gameModeFromPlayers(a: PlayerType, b: PlayerType): GameMode {
  if (a === PlayerType.Remote || b === PlayerType.Remote) return "vs remote";
  if (a === PlayerType.AI && b === PlayerType.AI) return "ai vs ai";
  if (a === PlayerType.AI || b === PlayerType.AI) return "vs ai";
  return "vs human";
}

export function winnerKind(
  scoreA: number,
  scoreB: number,
  typeA: PlayerType,
  typeB: PlayerType
): "human" | "ai" | "remote" | "tie" {
  if (scoreA === scoreB) return "tie";
  const type = scoreA > scoreB ? typeA : typeB;
  if (type === PlayerType.AI) return "ai";
  if (type === PlayerType.Remote) return "remote";
  return "human";
}

export function recordMove(
  session: GameSession,
  moverType: PlayerType,
  aiThinkMs = 0
) {
  session.moves += 1;
  if (moverType === PlayerType.AI) {
    session.aiMoves += 1;
    session.aiThinkMs += aiThinkMs;
  } else if (moverType === PlayerType.Remote) {
    session.remoteMoves += 1;
  } else {
    session.humanMoves += 1;
  }
}

export function trackGameStarted(mode: GameMode) {
  track(`game started ${mode}`);
}

export function trackGameCompleted(input: {
  mode: GameMode;
  winner: "human" | "ai" | "remote" | "tie";
  winnerScore: number;
  loserScore: number;
  totalMoves: number;
  aiMoves: number;
  aiThinkMs: number;
}) {
  track("game completed", cents(input.totalMoves));
  track(`game completed ${input.mode}`, cents(input.totalMoves));
  track(`game result ${input.winner}`, cents(input.winnerScore));
  track("score margin", cents(Math.abs(input.winnerScore - input.loserScore)));
  if (input.aiMoves > 0) {
    track("ai moves", cents(input.aiMoves));
    track(
      "ai think time",
      Math.round(input.aiThinkMs / input.aiMoves / 10)
    );
  }
}

export function trackGameAbandoned(mode: GameMode, moves: number) {
  track(`game abandoned ${mode}`, cents(moves));
}

export function trackAiToggled(enabled: boolean) {
  track(enabled ? "ai enabled" : "ai disabled");
}

export function trackAiMoveFailed() {
  track("ai move failed");
}

export function trackRemoteGameCreated() {
  track("remote game created");
}

export function trackRemoteGameJoined() {
  track("remote game joined");
}
