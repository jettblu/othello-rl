import { codeCharHash, codeChars, directions, emptyTile } from "@/constants/game";
import { IPosition, IBoard, IBoardUpdate } from "@/types";

export function stringFromBoard(board: IBoard) {
  return (board.join("") + "22")
    .match(/.{1,3}/g)!
    .map((chunk) => codeChars.charAt(parseInt(chunk, 3)))
    .join("");
}

export function boardFromString(s: string) {
  return s
    .split("")
    .flatMap((ch) =>
      (27 + codeCharHash[ch]).toString(3).slice(-3).split("").map(Number)
    )
    .slice(0, 64) as IBoard;
}

export function positionFromPieceIndex(
  pieceIndex: number
): IPosition | undefined {
  if (pieceIndex < 0 || pieceIndex >= 64) return;
  return { downwards: Math.floor(pieceIndex / 8), rightwards: pieceIndex % 8 };
}

export function pieceIndexFromPosition(
  position: IPosition
): number | undefined {
  if (
    position.downwards < 0 ||
    position.downwards >= 8 ||
    position.rightwards < 0 ||
    position.rightwards >= 8
  )
    return;
  return position.downwards * 8 + position.rightwards;
}

export function addPosition(p1: IPosition, p2: IPosition) {
  p1.rightwards += p2.rightwards;
  p1.downwards += p2.downwards;
}

export function playerScore(board: IBoard, player: 0 | 1) {
  return board.filter((piece) => piece === player).length;
}

export function flippableOpponentPiecesByDirection(
  board: IBoard,
  position: IPosition,
  player: 0 | 1
): number[] {
  const opponent = 1 - player;

  return directions.map((direction) => {
    let opponentPieces = 0;
    const currentPosition = { ...position };

    for (;;) {
      addPosition(currentPosition, direction);
      const currentIndex = pieceIndexFromPosition(currentPosition)!;
      if (board[currentIndex] === opponent) opponentPieces += 1;
      else if (board[currentIndex] === player) return opponentPieces;
      else return 0;
    }
  });
}

export function flipPiecesByDirections(
  board: IBoard,
  position: IPosition,
  pieceCounts: number[]
) {
  for (let i = 0; i < directions.length; i++) {
    const direction = directions[i],
      currentPosition = { ...position };

    for (let j = 0; j < pieceCounts[i]; j++) {
      addPosition(currentPosition, direction);
      const pieceIndex = pieceIndexFromPosition(currentPosition)!;
      board[pieceIndex] = (1 - board[pieceIndex]) as 0 | 1;
    }
  }
}

export function boardByPlayingPieceAtIndex(
  board: IBoard,
  pieceIndex: number,
  player: 0 | 1
) {
  const currentPiece = board[pieceIndex];
  if (currentPiece !== emptyTile) return;
  const position = positionFromPieceIndex(pieceIndex)!,
    flippablesByDirection = flippableOpponentPiecesByDirection(
      board,
      position,
      player
    ),
    flippablesCount = flippablesByDirection.reduce((memo, n) => memo + n);

  if (flippablesCount === 0) return;

  const newBoard = [...board];
  newBoard[pieceIndex] = player;
  flipPiecesByDirections(newBoard, position, flippablesByDirection);
  return newBoard;
}

export function playAtPieceIndex(
  board: IBoard,
  pieceIndex: number,
  player: 0 | 1
): IBoardUpdate | null {
  const newBoard = boardByPlayingPieceAtIndex(board, pieceIndex, player);
  if (!Array.isArray(newBoard)) return null;

  return {
    board: newBoard,
    boardStr: stringFromBoard(newBoard),
    lastPieceStr: pieceIndex.toString(),
    turnStr: (1 - player).toString(),
  };
}

export function playerCanPlay(board: IBoard, player: 0 | 1) {
  return board.some((piece, pieceIndex) =>
    piece === emptyTile
      ? flippableOpponentPiecesByDirection(
          board,
          positionFromPieceIndex(pieceIndex)!,
          player
        ).reduce((memo, n) => memo + n) > 0
      : false
  );
}
