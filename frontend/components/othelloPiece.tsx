import { memo, useState } from "react";
import * as m from "motion/react-m";
import { AnimatePresence, useReducedMotion } from "motion/react";
import { emptyTile } from "@/constants/game";
import { TOKEN } from "@/constants/palette";
import type { MoveRecommendation } from "@/helpers/aiMctsMap";
import { formatQ, formatRecommendWeight, formatVisitShare } from "@/helpers/aiMctsMap";

function emptyHeatShadow(strength: number, side: 0 | 1 | null | undefined) {
  const channel = side === 1 ? "var(--amber)" : "var(--phosphor)";
  return `inset 0 0 0 1px color-mix(in srgb, ${channel} ${Math.round(20 + strength * 35)}%, transparent), inset 0 0 ${8 + strength * 10}px color-mix(in srgb, ${channel} ${Math.round(strength * 25)}%, transparent)`;
}

function OthelloPiece({
  pieceIndex,
  playerIndex,
  wasLastMove,
  handlePieceSelection,
  scrub,
  mctsRecommendation,
  mctsChosen,
  showMctsLayer,
  mctsOverlayOpacity = 1,
  mctsStaggerIndex = 0,
  mctsFadeMs = 240,
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
  mctsRecommendation?: MoveRecommendation | null;
  mctsChosen?: boolean;
  showMctsLayer?: boolean;
  mctsOverlayOpacity?: number;
  mctsStaggerIndex?: number;
  mctsFadeMs?: number;
  moverTint?: 0 | 1 | null;
}) {
  const reduceMotion = useReducedMotion();
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
  const weightHeat =
    showMctsLayer && empty && mctsRecommendation && mctsRecommendation.weight > 0
      ? Math.min(1, Math.max(0, mctsRecommendation.weight))
      : null;

  const overlayDur = reduceMotion ? 0.01 : mctsFadeMs / 1000;
  const overlayDelay = reduceMotion
    ? 0
    : (mctsStaggerIndex % 64) * 0.006 * mctsOverlayOpacity;

  const tintClass =
    moverTint === 0 ? "text-p1" : moverTint === 1 ? "text-p2" : "text-crt-phosphor";

  function onClick() {
    const success = handlePieceSelection(pieceIndex, false);
    if (!success && empty) {
      setFlashInvalid(true);
      window.setTimeout(() => setFlashInvalid(false), 400);
    }
  }

  const showRecommend =
    showMctsLayer && empty && mctsRecommendation && mctsRecommendation.weight > 0;
  const labelOpacity = 0.85 * mctsOverlayOpacity;
  const weightLabel = mctsRecommendation
    ? formatRecommendWeight(mctsRecommendation.weight)
    : "—";

  return (
    <div
      className="relative min-w-0 w-full h-full"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <m.button
        type="button"
        aria-label={
          mctsRecommendation && showMctsLayer
            ? `Square ${pieceIndex + 1}, ${weightLabel} recommended`
            : `Square ${pieceIndex + 1}`
        }
        className="min-w-0 w-full h-full p-0 border-0 rounded-full appearance-none touch-manipulation relative"
        initial={false}
        animate={{
          x: flashInvalid ? [0, -5, 5, -4, 4, 0] : 0,
          scale: 1,
        }}
        whileHover={empty && !showMctsLayer ? { scale: 1.08 } : undefined}
        whileTap={empty ? { scale: 0.9 } : undefined}
        transition={{ duration: flashInvalid ? 0.32 : 0.12 }}
        onClick={onClick}
      >
        <m.span
          key={scrub ? "scrub" : playerIndex}
          className={`relative block w-full h-full rounded-full ${
            empty ? "overflow-visible" : ""
          } ${wasLastMove && !empty ? "piece-last" : ""}`}
          initial={scrub ? false : empty ? { scale: 1 } : { scale: 0.55 }}
          animate={{
            backgroundColor: fill,
            scale: 1,
            boxShadow:
              empty && weightHeat != null
                ? emptyHeatShadow(weightHeat, moverTint)
                : empty
                  ? "inset 0 0 0 0 transparent"
                  : "inset 0 0 0 1px rgba(0,0,0,0.4)",
          }}
          transition={{
            backgroundColor: { duration: scrub ? 0.05 : reduceMotion ? 0.05 : 0.32 },
            scale: { duration: scrub ? 0.05 : reduceMotion ? 0.05 : 0.32 },
            boxShadow: {
              duration: overlayDur,
              delay: overlayDelay,
            },
          }}
        >
          <AnimatePresence mode="popLayout" initial={false}>
            {showRecommend && mctsRecommendation && (
              <m.span
                key={`${mctsRecommendation.n}-${weightLabel}`}
                className={`absolute inset-0 flex items-center justify-center font-mono text-[8px] sm:text-[9px] tabular-nums pointer-events-none ${tintClass}`}
                initial={
                  reduceMotion
                    ? { opacity: labelOpacity }
                    : { opacity: 0, scale: 0.88, filter: "blur(2px)" }
                }
                animate={{
                  opacity: labelOpacity,
                  scale: 1,
                  filter: "blur(0px)",
                }}
                exit={
                  reduceMotion
                    ? { opacity: 0 }
                    : { opacity: 0, scale: 0.92, filter: "blur(1px)" }
                }
                transition={{
                  duration: overlayDur,
                  delay: overlayDelay,
                }}
              >
                {weightLabel}
              </m.span>
            )}
          </AnimatePresence>
        </m.span>
        <AnimatePresence initial={false}>
          {mctsChosen && showMctsLayer && (
            <m.span
              className="absolute inset-0 rounded-full pointer-events-none ring-2 ring-crt-phosphor/70 ring-offset-1 ring-offset-transparent"
              initial={reduceMotion ? false : { opacity: 0, scale: 0.92 }}
              animate={{ opacity: mctsOverlayOpacity, scale: 1 }}
              exit={{ opacity: 0, scale: 1.04 }}
              transition={{ duration: overlayDur * 0.85 }}
              aria-hidden
            />
          )}
        </AnimatePresence>
      </m.button>
      {showMctsLayer && mctsRecommendation && hovered && (
        <m.div
          className={`absolute z-30 left-1/2 -translate-x-1/2 pointer-events-none font-mono text-[9px] sm:text-[10px] leading-tight px-2 py-1 rounded-sm border border-crt-line text-crt-phosphor whitespace-nowrap shadow-[0_0_0_1px_color-mix(in_srgb,var(--phosphor)_18%,transparent),0_4px_14px_rgba(0,0,0,0.72)] ${
            tooltipAbove ? "bottom-full mb-1" : "top-full mt-1"
          }`}
          style={{ backgroundColor: "var(--ink)" }}
          initial={reduceMotion ? false : { opacity: 0, y: tooltipAbove ? 4 : -4 }}
          animate={{ opacity: mctsOverlayOpacity, y: 0 }}
          transition={{ duration: 0.14 }}
          role="tooltip"
        >
          <span className="text-crt-dim">rec</span> {weightLabel}
          <span className="text-crt-dim mx-1">·</span>
          <span className="text-crt-dim">Q</span> {formatQ(mctsRecommendation.q)}
          <span className="text-crt-dim mx-1">·</span>
          n={mctsRecommendation.n}
          <span className="text-crt-dim mx-1">·</span>
          <span className="text-crt-dim">visits</span>{" "}
          {formatVisitShare(mctsRecommendation.p)}
        </m.div>
      )}
    </div>
  );
}

export default memo(OthelloPiece);
