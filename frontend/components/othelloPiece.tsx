import { useEffect, useState } from "react";

const GREEN_SPACE_HOLDER = "#006e05";
export default function OthelloPiece(params: {
  pieceIndex: number;
  playerIndex: number;
  wasLastMove: boolean;
  handlePieceSelection: (
    pieceIndex: number,
    triggeredByRemote: boolean
  ) => boolean;
}) {
  const { pieceIndex, playerIndex, handlePieceSelection } = params;
  const [color, setColor] = useState<string>(GREEN_SPACE_HOLDER);

  // briefly set color to red if update fails

  function pieceSelector(pieceIndex: number) {
    const updateSuccess = handlePieceSelection(pieceIndex, false);
    console.log("updateSuccess", updateSuccess);
    if (!updateSuccess && playerIndex == 2) {
      // set to slightly transparent red
      setColor("#ff000080");
      setTimeout(() => {
        setColor(GREEN_SPACE_HOLDER);
      }, 500);
    }
  }
  useEffect(() => {
    // black if 0, white if 1, green if 2
    const newColor =
      playerIndex == 0
        ? "black"
        : playerIndex == 1
        ? "white"
        : GREEN_SPACE_HOLDER;
    setColor(newColor);
  }, [playerIndex]);
  return (
    <div
      className={`text-white w-[90%] h-[40px] md:h-[90px] rounded-full hover:cursor-pointer ${
        params.wasLastMove ? "ring-4 ring-gray-100/50" : ""
      }`}
      style={{
        backgroundColor: color,
      }}
      onClick={() => pieceSelector(pieceIndex)}
    ></div>
  );
}
