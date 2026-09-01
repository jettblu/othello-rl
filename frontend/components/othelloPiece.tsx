import { memo, useState } from "react";

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

  function onClick() {
    const success = handlePieceSelection(pieceIndex, false);
    if (!success && playerIndex === 2) {
      setFlashInvalid(true);
      window.setTimeout(() => setFlashInvalid(false), 500);
    }
  }

  return (
    <div
      className={`text-white w-[90%] h-[40px] md:h-[90px] rounded-full hover:cursor-pointer ${
        wasLastMove ? "ring-4 ring-gray-100/50" : ""
      }`}
      style={{
        backgroundColor: flashInvalid ? "#ff000080" : pieceColor(playerIndex),
      }}
      onClick={onClick}
    />
  );
}

export default memo(OthelloPiece);
