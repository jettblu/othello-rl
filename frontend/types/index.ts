export interface IPlayer {
  name: string;
  score: number;
  type: PlayerType;
  hasMove: boolean;
}

export enum PlayerType {
  Human,
  AI,
}

export interface IGameAttrs {
  boardStr: string;
  lastPieceStr: string;
  turnStr: string;
}

export interface IBoardUpdate extends IGameAttrs {
  board: IBoard;
}

export interface IFlags {
  gridNos: boolean;
  ai0: boolean;
  ai1: boolean;
}

export interface IPosition {
  // can also represent a vector movement
  rightwards: number;
  downwards: number;
}

// 0 = black, 1 = white, 2 = empty
export type IPiece = 0 | 1 | 2;

export type IBoard = IPiece[];

export type ResponseAiMove = {
  moveIndex: number | null;
};
