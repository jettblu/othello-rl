import type { AiMoveTrace } from "@/helpers/aiAgent";
import { squareFromPieceIndex } from "@/helpers/gameplay";

export type MoveGrade =
  | "best"
  | "excellent"
  | "good"
  | "inaccuracy"
  | "mistake"
  | "blunder";

export type ReviewTone = "good" | "ok" | "bad";

export type BetterMove = {
  idx: number;
  sq: string;
  /** Win-chance points this square had over the move that was played. */
  betterPp: number;
};

export type MoveReview = {
  playedIndex: number;
  grade: MoveGrade;
  lossPp: number;
  playedQ: number;
  better: BetterMove[];
  summary: string;
};

export type ReviewMark = {
  kind: "played" | "better";
  /** Grade word on the played disc, or "+N%" on a better square. */
  mark: string;
  tone: ReviewTone;
  /** Tooltip, already in percent language. */
  detail: string;
};

/** Win-chance points the mover gave up relative to the engine's best move. */
export function lossPercentagePoints(bestQ: number, playedQ: number) {
  return Math.max(0, (bestQ - playedQ) * 50);
}

export function gradeFromLoss(lossPp: number): MoveGrade {
  if (lossPp <= 2) return "best";
  if (lossPp <= 5) return "excellent";
  if (lossPp <= 10) return "good";
  if (lossPp <= 20) return "inaccuracy";
  if (lossPp <= 30) return "mistake";
  return "blunder";
}

export function gradeTone(grade: MoveGrade): ReviewTone {
  if (grade === "best" || grade === "excellent") return "good";
  if (grade === "good") return "ok";
  return "bad";
}

export function gradeLabel(grade: MoveGrade) {
  switch (grade) {
    case "best":
      return "best";
    case "excellent":
      return "great";
    case "good":
      return "good";
    case "inaccuracy":
      return "weak";
    case "mistake":
      return "mistake";
    case "blunder":
      return "blunder";
  }
}

export function reviewFromTrace(
  trace: AiMoveTrace,
  playedIndex: number,
  playedQ: number
): MoveReview | null {
  const visited = trace.moves.filter((move) => move.n > 0);
  if (visited.length === 0) return null;

  let best = visited[0];
  for (const move of visited) {
    if (move.q > best.q) best = move;
  }

  const onlyMove = trace.moves.length <= 1;
  const lossPp = onlyMove ? 0 : lossPercentagePoints(best.q, playedQ);
  const grade = onlyMove ? "best" : gradeFromLoss(lossPp);

  const better =
    grade === "best"
      ? []
      : visited
          .filter((move) => move.idx !== playedIndex && move.q > playedQ + 1e-4)
          .sort((a, b) => b.q - a.q)
          .slice(0, 3)
          .map((move) => ({
            idx: move.idx,
            sq: move.sq || squareFromPieceIndex(move.idx),
            betterPp: Math.round(lossPercentagePoints(move.q, playedQ)),
          }))
          .filter((move) => move.betterPp > 0);

  const sq = squareFromPieceIndex(playedIndex);
  const label = gradeLabel(grade);
  const [lead, ...rest] = better;
  const summary =
    grade === "best" || !lead
      ? `${sq} ${label}`
      : `${sq} ${label} · ${lead.sq} was ${lead.betterPp}% better${rest
          .map((move) => ` · ${move.sq} ${move.betterPp}%`)
          .join("")}`;

  return { playedIndex, grade, lossPp, playedQ, better, summary };
}

export function marksFromReview(review: MoveReview) {
  const marks = new Map<number, ReviewMark>();
  const tone = gradeTone(review.grade);
  const label = gradeLabel(review.grade);
  marks.set(review.playedIndex, {
    kind: "played",
    mark: label,
    tone,
    detail: `played · ${label}`,
  });
  for (const move of review.better) {
    marks.set(move.idx, {
      kind: "better",
      mark: `+${move.betterPp}%`,
      tone: "good",
      detail: `${move.betterPp}% better`,
    });
  }
  return marks;
}
