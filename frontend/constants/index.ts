import { stringFromBoard } from "@/helpers/gameplay";
import { IBoard } from "@/types";

export const x = 2,
  initialBoard: IBoard = [
    x, x, x, x, x, x, x, x,
    x, x, x, x, x, x, x, x,
    x, x, x, x, x, x, x, x,
    x, x, x, 1, 0, x, x, x,
    x, x, x, 0, 1, x, x, x,
    x, x, x, x, x, x, x, x,
    x, x, x, x, x, x, x, x,
    x, x, x, x, x, x, x, x,
  ],
  codeChars = `234567bcdfghjkmnpqrstvwxyz-`,
  codeCharHash = Object.fromEntries(codeChars.split("").map((ch, i) => [ch, i])),
  initialBoardStr = stringFromBoard(initialBoard),
  emptyTile = 2,
  directions = [-1, 0, 1].flatMap((d) =>
    (d === 0 ? [-1, 1] : [-1, 0, 1]).map((r) => ({
      downwards: d,
      rightwards: r,
    }))
  ),
  initialGameConfig = {
    boardStr: initialBoardStr,
    lastPieceStr: "-",
    turnStr: "0",
  };
