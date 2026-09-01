export interface IPlayer {
  name: string;
  score: number;
  type: PlayerType;
  hasMove: boolean;
}

export enum PlayerType {
  Human,
  AI,
  Remote,
}

export interface IGameAttrs {
  boardStr: string;
  lastPieceStr: string;
  turnStr: string;
}

export interface IBoardUpdate extends IGameAttrs {
  board: IBoard;
}

export interface IPosition {
  rightwards: number;
  downwards: number;
}

export type IPiece = 0 | 1 | 2;

export type IBoard = IPiece[];
