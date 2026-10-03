import { memo, useState } from "react";
import * as m from "motion/react-m";
import { emptyTile } from "@/constants/game";
import { TOKEN } from "@/constants/palette";
import type { MctsCellInsight } from "@/helpers/aiMctsMap";
import { formatQ } from "@/helpers/aiMctsMap";

function OthelloPiece({
  pieceIndex,
  playerIndex,
  wasLastMove,
  handlePieceSelection,
  scrub,
  mctsInsight,
  mctsChosen,
  showMctsLayer,
  moverTint,
}: {
  pieceIndex: number;
  playerIndex: number;
  wasLastMove: boolean;
  handlePieceSelection: (
    pieceIndex: number,
    triggeredByRemote: boolean
  ) => boolean;
  scrub?: boolean;
  mctsInsight?: MctsCellInsight | null;
  mctsChosen?: boolean;
  showMctsLayer?: boolean;
  moverTint?: 0 | 1 | null;
}) {
  const [flashInvalid, setFlashInvalid] = useState(false);
  const [hovered, setHovered] = useState(false);
  const empty = playerIndex === emptyTile;
  const fill = flashInvalid
    ? `color-mix(in srgb, ${TOKEN.amber} 60%, transparent)`
    : playerIndex === 0
      ? TOKEN.phosphor
      : playerIndex === 1
        ? TOKEN.amber
        : TOKEN.felt;

  const row = Math.floor(pieceIndex / 8);
  const tooltipAbove = row > 0;
  const qHeat =
    showMctsLayer && empty && mctsInsight
      ? Math.min(1, Math.max(0, (mctsInsight.q + 1) / 2))
      : null;

  function onClick() {
    const success = handlePieceSelection(pieceIndex, false);
    if (!success && empty) {
      setFlashInvalid(true);
      window.setTimeout(() => setFlashInvalid(false), 400);
    }
  }

  const tintClass =
    moverTint === 0 ? "text-p1" : moverTint === 1 ? "text-p2" : "text-crt-phosphor";

  return (
    <div
      className="relative min-w-0 w-full h-full"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <m.button
        type="button"
        aria-label={
          mctsInsight && showMctsLayer
            ? `Square ${pieceIndex + 1}, Q ${formatQ(mctsInsight.q)}`
            : `Square ${pieceIndex + 1}`
        }
        className={`min-w-0 w-full h-full p-0 border-0 rounded-full appearance-none touch-manipulation transition-[box-shadow] duration-[50ms] ${
          empty ? "overflow-visible" : ""
        } ${mctsChosen && showMctsLayer ? "ring-2 ring-crt-phosphor/70 ring-offset-1 ring-offset-transparent" : ""}`}
        initial={false}
        animate={flashInvalid ? { x: [0, -5, 5, -4, 4, 0] } : { x: 0 }}
        whileHover={empty && !showMctsLayer ? { scale: 1.08 } : undefined}
        whileTap={empty ? { scale: 0.9 } : undefined}
        transition={{ duration: flashInvalid ? 0.32 : 0.12 }}
        onClick={onClick}
      >
        <m.span
          key={scrub ? "scrub" : playerIndex}
          className={`relative block w-full h-full rounded-full ${
            wasLastMove && !empty ? "piece-last" : ""
          }`}
          style={{
            boxShadow: empty
              ? qHeat != null
                ? `inset 0 0 0 1px color-mix(in srgb, var(--phosphor) ${Math.round(20 + qHeat * 35)}%, transparent), inset 0 0 ${8 + qHeat * 10}px color-mix(in srgb, var(--phosphor) ${Math.round(qHeat * 25)}%, transparent)`
                : undefined
              : "inset 0 0 0 1px rgba(0,0,0,0.4)",
          }}
          initial={scrub ? false : empty ? { scale: 1 } : { scale: 0.55 }}
          animate={{ backgroundColor: fill, scale: 1 }}
          transition={{ duration: scrub ? 0.05 : 0.28 }}
        >
          {showMctsLayer && mctsInsight && empty && (
            <span
              className={`absolute inset-0 flex items-center justify-center font-mono text-[8px] sm:text-[9px] tabular-nums pointer-events-none ${tintClass} opacity-80`}
            >
              {formatQ(mctsInsight.q)}
            </span>
          )}
        </m.span>
      </m.button>
      {showMctsLayer && mctsInsight && hovered && (
        <div
          className={`absolute z-20 left-1/2 -translate-x-1/2 pointer-events-none font-mono text-[9px] sm:text-[10px] leading-tight px-1.5 py-1 rounded-sm border border-crt-line bg-ink/95 shadow-[0_0_12px_color-mix(in_srgb,var(--phosphor)_12%,transparent)] whitespace-nowrap ${tintClass} ${
            tooltipAbove ? "bottom-full mb-1" : "top-full mt-1"
          }`}
          role="tooltip"
        >
          <span className="text-crt-dim">Q</span> {formatQ(mctsInsight.q)}
          <span className="text-crt-dim mx-1">·</span>
          n={mctsInsight.n}
          <span className="text-crt-dim mx-1">·</span>
          p={(mctsInsight.p * 100).toFixed(0)}%
        </div>
      )}
    </div>
  );
}

export default memo(OthelloPiece);
