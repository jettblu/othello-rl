import type { AiCandidate, AiMoveTrace } from "@/helpers/aiAgent";

export type MoveRecommendation = AiCandidate & {
  /** Relative recommendation weight in [0, 1], normalized across root legal moves. */
  weight: number;
};

export function recommendationsByIndex(trace: AiMoveTrace | null) {
  const map = new Map<number, MoveRecommendation>();
  if (!trace) return map;

  const sum = trace.moves.reduce((acc, move) => acc + Math.max(0, move.p), 0);
  const denom = sum > 0 ? sum : 1;

  for (const move of trace.moves) {
    map.set(move.idx, {
      ...move,
      weight: Math.max(0, move.p) / denom,
    });
  }
  return map;
}

export function formatQ(value: number) {
  if (!Number.isFinite(value)) return "—";
  const sign = value >= 0 ? "+" : "";
  return `${sign}${value.toFixed(2)}`;
}

export function formatRecommendWeight(weight: number) {
  if (!Number.isFinite(weight) || weight <= 0) return "—";
  const pct = weight * 100;
  if (pct < 1) return "<1%";
  if (pct >= 10) return `${Math.round(pct)}%`;
  return `${pct.toFixed(1)}%`;
}

export function formatVisitShare(p: number) {
  if (!Number.isFinite(p) || p <= 0) return "0%";
  return `${(p * 100).toFixed(0)}%`;
}
