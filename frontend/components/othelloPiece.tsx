import { memo, useState } from "react";
import * as m from "motion/react-m";
import { useReducedMotion } from "motion/react";
import { emptyTile } from "@/constants/game";
import { TOKEN } from "@/constants/palette";
import { squareFromPieceIndex } from "@/helpers/gameplay";
import type { ReviewMark } from "@/helpers/moveReview";

function reviewShadow(played: boolean) {
  if (played) {
    return "inset 0 0 0 3px var(--halo), inset 0 0 10px color-mix(in srgb, var(--halo) 50%, transparent)";
  }
  return "inset 0 0 0 2px color-mix(in srgb, var(--phosphor) 55%, transparent)";
}

function OthelloPiece({
  pieceIndex,
  playerIndex,
  wasLastMove,
  handlePieceSelection,
  scrub,
  reviewMark,
}: {
  pieceIndex: number;
  playerIndex: number;
  wasLastMove: boolean;
  handlePieceSelection: (
    pieceIndex: number,
    triggeredByRemote: boolean
  ) => boolean;
  scrub?: boolean;
  reviewMark?: ReviewMark | null;
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
  const square = squareFromPieceIndex(pieceIndex);
  const showBetter = reviewMark?.kind === "better" && empty;
  const showPlayed = reviewMark?.kind === "played" && !empty;

  function onClick() {
    const success = handlePieceSelection(pieceIndex, false);
    if (!success && empty) {
      setFlashInvalid(true);
      window.setTimeout(() => setFlashInvalid(false), 400);
    }
  }

  return (
    <div
      className="relative isolate z-0 min-w-0 w-full h-full"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <m.button
        type="button"
        aria-label={
          reviewMark
            ? reviewMark.kind === "played"
              ? `${square} played, ${reviewMark.mark}`
              : `${square}, ${reviewMark.detail}`
            : `Square ${square}`
        }
        className="relative z-0 min-w-0 w-full h-full p-0 border-0 rounded-full appearance-none touch-manipulation"
        initial={false}
        animate={{
          x: flashInvalid ? [0, -5, 5, -4, 4, 0] : 0,
          scale: 1,
        }}
        whileHover={empty && !showBetter ? { scale: 1.08 } : undefined}
        whileTap={empty ? { scale: 0.9 } : undefined}
        transition={{ duration: flashInvalid ? 0.32 : 0.12 }}
        onClick={onClick}
      >
        <m.span
          key={scrub ? "scrub" : playerIndex}
          className={`relative block w-full h-full rounded-full ${
            wasLastMove && !empty ? "piece-last" : ""
          }`}
          initial={scrub ? false : empty ? { scale: 1 } : { scale: 0.55 }}
          animate={{
            backgroundColor: fill,
            scale: 1,
            boxShadow: reviewMark
              ? reviewShadow(reviewMark.kind === "played")
              : empty
                ? "inset 0 0 0 0 transparent"
                : "inset 0 0 0 1px rgba(0,0,0,0.4)",
          }}
          transition={{
            backgroundColor: { duration: scrub ? 0.05 : reduceMotion ? 0.05 : 0.32 },
            scale: { duration: scrub ? 0.05 : reduceMotion ? 0.05 : 0.32 },
            boxShadow: { duration: reduceMotion ? 0.05 : 0.2 },
          }}
        >
          {showPlayed && reviewMark && (
            <span className="absolute inset-0 flex items-center justify-center px-0.5 text-center font-mono text-[7px] sm:text-[8px] leading-none text-ink pointer-events-none">
              {reviewMark.mark}
            </span>
          )}
          {showBetter && reviewMark && (
            <span
              className="absolute inset-0 flex items-center justify-center font-mono text-[8px] sm:text-[9px] leading-none tabular-nums text-crt-phosphor pointer-events-none"
            >
              {reviewMark.mark}
            </span>
          )}
        </m.span>
      </m.button>
      {showPlayed && (
        <span
          className={`absolute left-1/2 top-0 z-10 max-w-full -translate-x-1/2 whitespace-nowrap rounded-sm border border-crt-line bg-ink px-px py-0.5 font-mono text-[7px] leading-snug text-crt-phosphor pointer-events-none ${
            row === 0 ? "-translate-y-[45%]" : "-translate-y-[62%]"
          }`}
        >
          played
        </span>
      )}
      {reviewMark && hovered && (
        <div
          className={`absolute z-30 left-1/2 -translate-x-1/2 pointer-events-none font-mono text-[9px] sm:text-[10px] leading-tight px-2 py-1 rounded-sm border border-crt-line text-crt-phosphor whitespace-nowrap shadow-[0_0_0_1px_color-mix(in_srgb,var(--phosphor)_18%,transparent),0_4px_14px_rgba(0,0,0,0.72)] ${
            tooltipAbove ? "bottom-full mb-1" : "top-full mt-1"
          }`}
          style={{ backgroundColor: "var(--ink)" }}
          role="tooltip"
        >
          {reviewMark.detail}
        </div>
      )}
    </div>
  );
}

export default memo(OthelloPiece);
