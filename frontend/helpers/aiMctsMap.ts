import type { AiCandidate, AiMoveTrace } from "@/helpers/aiAgent";

export type MctsCellInsight = AiCandidate;

export function mctsInsightByIndex(trace: AiMoveTrace | null) {
  const map = new Map<number, MctsCellInsight>();
  if (!trace) return map;
  for (const move of trace.moves) {
    map.set(move.idx, move);
  }
  return map;
}

export function formatQ(value: number) {
  if (!Number.isFinite(value)) return "—";
  const sign = value >= 0 ? "+" : "";
  return `${sign}${value.toFixed(2)}`;
}
