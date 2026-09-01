import { memo, useState } from "react";
import * as m from "motion/react-m";
import { emptyTile } from "@/constants/game";
import { TOKEN } from "@/constants/palette";

function OthelloPiece({
  pieceIndex,
  playerIndex,
  wasLastMove,
  handlePieceSelection,
}: {
  pieceIndex: number;
  playerIndex: number;
  wasLastMove: boolean;
  handlePieceSelection: (
    pieceIndex: number,
    triggeredByRemote: boolean
  ) => boolean;
}) {
  const [flashInvalid, setFlashInvalid] = useState(false);
  const empty = playerIndex === emptyTile;
  const fill = flashInvalid
    ? `color-mix(in srgb, ${TOKEN.amber} 60%, transparent)`
    : playerIndex === 0
      ? TOKEN.phosphor
      : playerIndex === 1
        ? TOKEN.amber
        : TOKEN.felt;

  function onClick() {
    const success = handlePieceSelection(pieceIndex, false);
    if (!success && empty) {
      setFlashInvalid(true);
      window.setTimeout(() => setFlashInvalid(false), 400);
    }
  }

  return (
    <m.button
      type="button"
      aria-label={`Square ${pieceIndex + 1}`}
      className={`min-w-0 w-full h-full p-0 border-0 rounded-full appearance-none touch-manipulation ${
        wasLastMove && !empty ? "piece-last" : ""
      }`}
      initial={false}
      animate={flashInvalid ? { x: [0, -5, 5, -4, 4, 0] } : { x: 0 }}
      whileHover={empty ? { scale: 1.08 } : undefined}
      whileTap={empty ? { scale: 0.9 } : undefined}
      transition={{ duration: flashInvalid ? 0.32 : 0.12 }}
      onClick={onClick}
    >
      <m.span
        key={playerIndex}
        className="block w-full h-full rounded-full"
        style={{
          backgroundColor: fill,
          boxShadow: empty ? undefined : "inset 0 0 0 1px rgba(0,0,0,0.4)",
        }}
        initial={empty ? { scale: 1 } : { scale: 0.55 }}
        animate={{ scale: 1 }}
        transition={{ duration: 0.28 }}
      />
    </m.button>
  );
}

export default memo(OthelloPiece);
