import { IBoardUpdate, IGameAttrs } from "@/types";

export const RESET_GAME = "RESET";
export const TOGGLE_PLAYERA_AI = "SET_PLAYERA_AI";
export const TOGGLE_PLAYERB_AI = "SET_PLAYERB_AI";
export const UPDATE_BOARD = "UPDATE_BOARD";
export const SET_GAME_ATTRS = "SET_GAME_ATTRS";
export const SET_PLAYERA_SCORE = "SET_PLAYERA_SCORE";
export const SET_PLAYERB_SCORE = "SET_PLAYERB_SCORE";
export const SET_PLAYERA_CANPLAY = "SET_PLAYERA_CANPLAY";
export const SET_PLAYERB_CANPLAY = "SET_PLAYERB_CANPLAY";
export const TOGGLE_TURN = "CHANGE_TURN";
export const TOGGLE_PLAYERA_REMOTE = "SET_PLAYERA_REMOTE";
export const TOGGLE_PLAYERB_REMOTE = "SET_PLAYERB_REMOTE";

export const resetGame = () => ({
  type: RESET_GAME,
});

export const toggle_playerA_Ai = () => ({
  type: TOGGLE_PLAYERA_AI,
});

export const toggle_PlayerA_Remote = () => ({
  type: TOGGLE_PLAYERA_REMOTE,
});

export const toggle_PlayerB_Remote = () => ({
  type: TOGGLE_PLAYERB_REMOTE,
});

export const toggle_playerB_Ai = () => ({
  type: TOGGLE_PLAYERB_AI,
});

export const updateBoard = (boardUpdate: IBoardUpdate) => ({
  type: UPDATE_BOARD,
  payload: boardUpdate,
});

export const setGameConfig = (config: IGameAttrs) => ({
  type: SET_GAME_ATTRS,
  payload: config,
});

export const setPlayerAScore = (score: number) => ({
  type: SET_PLAYERA_SCORE,
  payload: score,
});

export const setPlayerACanPlay = (canPlay: boolean) => ({
  type: SET_PLAYERA_CANPLAY,
  payload: canPlay,
});

export const setPlayerBCanPlay = (canPlay: boolean) => ({
  type: SET_PLAYERB_CANPLAY,
  payload: canPlay,
});

export const setPlayerBScore = (score: number) => ({
  type: SET_PLAYERB_SCORE,
  payload: score,
});

export const toggleTurn = () => ({
  type: TOGGLE_TURN,
});
