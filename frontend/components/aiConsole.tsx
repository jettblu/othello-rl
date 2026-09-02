"use client";

import type { AiMoveTrace } from "@/helpers/aiAgent";
import { AI_SIMULATIONS, type AiDifficulty } from "@/constants/ai";
import { CMD, MSG, mctsCmd, playCmd, sideName } from "@/constants/terminal";

function bar(share: number) {
  const n = Math.max(0, Math.min(8, Math.round(share * 8)));
  return "#".repeat(n).padEnd(8, ".");
}

function q(value: number) {
  const sign = value >= 0 ? "+" : "";
  return `${sign}${value.toFixed(2)}`;
}

export default function AiConsole({
  active,
  thinking,
  trace,
  difficulty,
  onDifficultyChange,
}: {
  active: boolean;
  thinking: boolean;
  trace: AiMoveTrace | null;
  difficulty: AiDifficulty;
  onDifficultyChange: (difficulty: AiDifficulty) => void;
}) {
  if (!active) return null;

  const header = thinking
    ? CMD.mcts
    : trace
      ? mctsCmd({
          side: sideName(trace.player),
          sims: trace.sims,
          nodes: trace.nodes,
          root: trace.root,
          c: trace.c,
          ms: trace.ms,
        })
      : CMD.mcts;

  const pick =
    trace && trace.index >= 0
      ? (trace.moves.find((m) => m.idx === trace.index)?.sq ?? String(trace.index))
      : null;

  return (
    <div
      className="shrink-0 mt-1 min-h-[3.4rem] font-mono text-[10px] sm:text-xs leading-snug text-crt-dim overflow-hidden"
      aria-live="polite"
      aria-label="AI search console"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 truncate text-crt-phosphor/80">
          {header}
          {thinking && <span className="tui-cursor" aria-hidden />}
        </div>
        <button
          type="button"
          className="desktop-ai-difficulty shrink-0 text-crt-phosphor underline decoration-phosphor/45 underline-offset-[3px] hover:text-crt-amber hover:decoration-amber cursor-pointer"
          onClick={() =>
            onDifficultyChange(difficulty === "easy" ? "hard" : "easy")
          }
          aria-label={`AI difficulty ${difficulty}; activate the other level`}
        >
          {CMD.level} --{difficulty}
        </button>
      </div>
      {trace && !thinking && (
        <>
          <div className="truncate">
            {trace.moves.length === 0
              ? MSG.noRootMoves
              : trace.moves
                  .slice(0, 4)
                  .map((m) => `${m.sq} n=${m.n} q=${q(m.q)} ${bar(m.p)}`)
                  .join("  ")}
          </div>
          <div className={trace.player === 1 ? "text-p2" : "text-p1"}>
            {playCmd(pick)}
          </div>
        </>
      )}
    </div>
  );
}
