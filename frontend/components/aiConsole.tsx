"use client";

import type { AiMoveTrace } from "@/helpers/aiAgent";
import { CMD, MSG, mctsCmd, playCmd, sideName } from "@/constants/terminal";

export default function AiConsole({
  active,
  thinking,
  trace,
}: {
  active: boolean;
  thinking: boolean;
  trace: AiMoveTrace | null;
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
      className="shrink-0 mt-1 min-h-[2rem] font-mono text-[10px] sm:text-xs leading-snug text-crt-dim overflow-hidden"
      aria-live="polite"
      aria-label="AI search console"
    >
      <div className="min-w-0 truncate text-crt-phosphor/80">
        {header}
        {thinking && <span className="tui-cursor" aria-hidden />}
      </div>
      {trace && !thinking && (
        <div className={trace.player === 1 ? "text-p2" : "text-p1"}>
          {trace.moves.length === 0 ? MSG.noRootMoves : playCmd(pick)}
        </div>
      )}
    </div>
  );
}
