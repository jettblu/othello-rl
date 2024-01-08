import { IBoard, IGameAttrs, IPlayer } from "@/types";
import {
  TOGGLE_PLAYERA_AI,
  TOGGLE_PLAYERB_AI,
  setGameConfig,
  SET_GAME_ATTRS,
  UPDATE_BOARD,
  SET_PLAYERA_SCORE,
  SET_PLAYERB_SCORE,
  RESET_GAME,
  TOGGLE_TURN,
  SET_PLAYERA_CANPLAY,
  SET_PLAYERB_CANPLAY,
} from "../actions";
import { initialBoard, initialBoardStr, initialGameConfig } from "@/constants";
import { encodeFlags } from "@/helpers/gameplay";

export interface IGlobalState {
  playerA: IPlayer;
  playerB: IPlayer;
  board: IBoard;
  gameAttrs: IGameAttrs;
}

const globalState: IGlobalState = {
  playerA: {
    // black/0
    name: "Player A",
    score: 0,
    type: 0,
    hasMove: true,
  },
  playerB: {
    // white/1
    name: "Player B",
    score: 0,
    type: 0,
    hasMove: true,
  },
  board: initialBoard,
  gameAttrs: initialGameConfig,
};

const gameReducer = (state = globalState, action: any) => {
  switch (action.type) {
    case RESET_GAME:
      return {
        ...state,
        playerA: {
          ...state.playerA,
          score: 0,
          hasMove: true,
        },
        playerB: {
          ...state.playerB,
          score: 0,
          hasMove: true,
        },
        board: initialBoard,
        gameAttrs: initialGameConfig,
      };

    case TOGGLE_PLAYERA_AI:
      return {
        ...state,
        playerA: {
          ...state.playerA,
          type: state.playerA.type === 0 ? 1 : 0,
        },
      };

    case TOGGLE_PLAYERB_AI:
      return {
        ...state,
        playerB: {
          ...state.playerB,
          type: state.playerB.type === 0 ? 1 : 0,
        },
      };

    case TOGGLE_TURN:
      return {
        ...state,
        gameAttrs: {
          ...state.gameAttrs,
          turnStr: state.gameAttrs.turnStr === "0" ? "1" : "0",
        },
      };

    case SET_GAME_ATTRS:
      return {
        ...state,
        gameAttrs: action.payload,
      };

    case SET_PLAYERA_SCORE:
      return {
        ...state,
        playerA: {
          ...state.playerA,
          score: action.payload,
        },
      };

    case SET_PLAYERB_SCORE:
      return {
        ...state,
        playerB: {
          ...state.playerB,
          score: action.payload,
        },
      };

    case UPDATE_BOARD:
      return {
        ...state,
        board: action.payload.board,
        gameAttrs: {
          ...state.gameAttrs,
          boardStr: action.payload.boardStr,
          lastPieceStr: action.payload.lastPieceStr,
          turnStr: action.payload.turnStr,
        },
      };
    case SET_PLAYERA_CANPLAY:
      return {
        ...state,
        playerA: {
          ...state.playerA,
          hasMove: action.payload,
        },
      };

    case SET_PLAYERB_CANPLAY:
      return {
        ...state,
        playerB: {
          ...state.playerB,
          hasMove: action.payload,
        },
      };

    default:
      return state;
  }
};

export default gameReducer;
