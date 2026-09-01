import { memo, useState } from "react";
import * as m from "motion/react-m";

const EMPTY_COLOR = "#006e05";

function pieceColor(playerIndex: number) {
  if (playerIndex === 0) return "black";
  if (playerIndex === 1) return "white";
  return EMPTY_COLOR;
}

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
  const empty = playerIndex === 2;

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
        wasLastMove ? "ring-2 sm:ring-4 ring-gray-100/50" : ""
      }`}
      initial={false}
      animate={flashInvalid ? { x: [0, -5, 5, -4, 4, 0] } : { x: 0 }}
      whileHover={empty ? { scale: 1.08 } : undefined}
      whileTap={empty ? { scale: 0.9 } : undefined}
      transition={{ duration: 0.32 }}
      onClick={onClick}
    >
      <m.span
        key={playerIndex}
        className="block w-full h-full rounded-full"
        style={{
          backgroundColor: flashInvalid ? "#ff000080" : pieceColor(playerIndex),
        }}
        initial={empty ? { scale: 1 } : { scale: 0.55 }}
        animate={{ scale: 1 }}
        transition={{ duration: 0.28 }}
      />
    </m.button>
  );
}

export default memo(OthelloPiece);
