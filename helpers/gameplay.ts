import { codeCharHash, codeChars, directions, emptyTile } from "@/constants";
import { IPosition, IBoard, IFlags, IGameAttrs, IBoardUpdate } from "@/types";

// convert a board to a string, for use in the URL
export function stringFromBoard(board: IBoard) {
  return (board.join("") + "22")
    .match(/.{1,3}/g)!
    .map((x) => codeChars.charAt(parseInt(x, 3)))
    .join("");
}

export function boardFromString(s: string) {
  return s
    .split("")
    .flatMap((x) =>
      {
        console.log(x)
        const temp = codeCharHash[x].toString(3)
        console.log(temp)
        return (27 + codeCharHash[x]).toString(3).slice(-3).split("").map(Number)
      }
    )
    .slice(0, 64) as IBoard;
}



export function encodeFlags(flags: IFlags) {
  return (
    (flags.gridNos ? 1 : 0) * 0b001 +
    (flags.ai0 ? 1 : 0) * 0b010 +
    (flags.ai1 ? 1 : 0) * 0b100
  );
}

export function decodeFlags(flags: number): IFlags {
  return {
    gridNos: !!(flags & 0b001),
    ai0: !!(flags & 0b010),
    ai1: !!(flags & 0b100),
  };
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
  return board.filter((x) => x === player).length;
}

export function flippableOpponentPiecesByDirection(
  board: IBoard,
  position: IPosition,
  player: 0 | 1
):number[] {
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
  if (currentPiece !== emptyTile) return; // can't play where there's already a piece
  const position = positionFromPieceIndex(pieceIndex)!,
    flippablesByDirection = flippableOpponentPiecesByDirection(
      board,
      position,
      player
    ),
    flippablesCount = flippablesByDirection.reduce((memo, n) => memo + n);

  if (flippablesCount === 0) return; // can't play if nothing gets flipped

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

  const newBoardStr = stringFromBoard(newBoard);
  const lastPieceStr = pieceIndex.toString();
  const turnStr = (1 - player).toString();
  const boardUpdate: IBoardUpdate = {
    board: newBoard,
    boardStr: newBoardStr,
    lastPieceStr,
    turnStr,
  };
  console.log("new board", newBoard);
  return boardUpdate;
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

export function piecesByPlayer(board: IBoard) {
  return board.reduce(
    (memo, piece) => {
      memo[piece] += 1;
      return memo;
    },
    [0, 0, 0]
  );
}

export function boardScoreForPlayer(
  board: IBoard,
  player: 0 | 1,
  cornerScore = 12,
  edgeScore = 4,
  otherScore = 1
) {
  return board.reduce(
    (memo: number, piece, i) =>
      memo +
      (piece !== player
        ? 0
        : i === 0 || i === 7 || i === 56 || i === 63
        ? cornerScore
        : i <= 7 || i >= 56 || i % 8 === 0 || i % 8 === 7
        ? edgeScore
        : otherScore),
    0
  );
}

export function suggestMoves(board: IBoard, player: 0 | 1) {
  const opponent = (1 - player) as 0 | 1;
  let bestWorstCaseScore = -Infinity,
    bestMoves: number[] = [];

  for (let i = 0; i < 64; i++) {
    const board1 = boardByPlayingPieceAtIndex(board, i, player);
    if (!Array.isArray(board1)) continue;

    // the tie-break score represents how good the board is for us straight away
    const tieBreakScore =
      (boardScoreForPlayer(board1, player) -
        boardScoreForPlayer(board1, opponent)) /
      100;

    let worstCaseScore = Infinity;
    for (let j = 0; j < 64; j++) {
      const board2 = boardByPlayingPieceAtIndex(board1, j, opponent);
      if (!Array.isArray(board2)) continue;
      // subtracting opponent score isn't redundant, because of edge and corner boosts
      const score =
        boardScoreForPlayer(board2, player) -
        boardScoreForPlayer(board2, opponent) +
        tieBreakScore;
      if (score < worstCaseScore) worstCaseScore = score;
    }

    if (worstCaseScore === bestWorstCaseScore) bestMoves.push(i);
    else if (worstCaseScore > bestWorstCaseScore) {
      bestWorstCaseScore = worstCaseScore;
      bestMoves = [i];
    }
  }

  return bestMoves;
}
