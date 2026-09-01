import { stringFromBoard } from "@/helpers/gameplay";
import { IBoard } from "@/types";

export const emptyTile = 2;

const x = emptyTile;

export const PLAYER_NAMES = ["Player A", "Player B"] as const;

export const initialBoard: IBoard = [
  x, x, x, x, x, x, x, x,
  x, x, x, x, x, x, x, x,
  x, x, x, x, x, x, x, x,
  x, x, x, 1, 0, x, x, x,
  x, x, x, 0, 1, x, x, x,
  x, x, x, x, x, x, x, x,
  x, x, x, x, x, x, x, x,
  x, x, x, x, x, x, x, x,
];

export const codeChars = `234567bcdfghjkmnpqrstvwxyz-`;
export const codeCharHash = Object.fromEntries(
  codeChars.split("").map((ch, i) => [ch, i])
);
export const initialBoardStr = stringFromBoard(initialBoard);

export const directions = [-1, 0, 1].flatMap((d) =>
  (d === 0 ? [-1, 1] : [-1, 0, 1]).map((r) => ({
    downwards: d,
    rightwards: r,
  }))
);

export const initialGameConfig = {
  boardStr: initialBoardStr,
  lastPieceStr: "-",
  turnStr: "0",
};
