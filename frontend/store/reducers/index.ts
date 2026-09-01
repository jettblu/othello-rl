import { IBoard, IGameAttrs, IPlayer, PlayerType } from "@/types";
import {
  TOGGLE_PLAYERA_AI,
  TOGGLE_PLAYERB_AI,
  UPDATE_BOARD,
  RESET_GAME,
  TOGGLE_TURN,
  SET_PLAYERA_REMOTE,
  SET_PLAYERB_REMOTE,
} from "../actions";
import { initialBoard, initialGameConfig } from "@/constants";
import { playerCanPlay, playerScore } from "@/helpers/gameplay";

export interface IGlobalState {
  playerA: IPlayer;
  playerB: IPlayer;
  board: IBoard;
  gameAttrs: IGameAttrs;
}

function playerFromBoard(
  player: IPlayer,
  board: IBoard,
  piece: 0 | 1,
  type = player.type
): IPlayer {
  return {
    ...player,
    type,
    score: playerScore(board, piece),
    hasMove: playerCanPlay(board, piece),
  };
}

const globalState: IGlobalState = {
  playerA: playerFromBoard(
    {
      name: "Player A",
      score: 0,
      type: PlayerType.Human,
      hasMove: true,
    },
    initialBoard,
    0
  ),
  playerB: playerFromBoard(
    {
      name: "Player B",
      score: 0,
      type: PlayerType.Human,
      hasMove: true,
    },
    initialBoard,
    1
  ),
  board: initialBoard,
  gameAttrs: initialGameConfig,
};

const gameReducer = (
  state = globalState,
  action: { type: string; payload?: { board: IBoard } & IGameAttrs }
): IGlobalState => {
  switch (action.type) {
    case RESET_GAME:
      return {
        ...state,
        playerA: playerFromBoard(state.playerA, initialBoard, 0, PlayerType.Human),
        playerB: playerFromBoard(state.playerB, initialBoard, 1, PlayerType.Human),
        board: initialBoard,
        gameAttrs: initialGameConfig,
      };

    case TOGGLE_PLAYERA_AI:
      return {
        ...state,
        playerA: {
          ...state.playerA,
          type:
            state.playerA.type === PlayerType.Human
              ? PlayerType.AI
              : PlayerType.Human,
        },
      };

    case TOGGLE_PLAYERB_AI:
      return {
        ...state,
        playerB: {
          ...state.playerB,
          type:
            state.playerB.type === PlayerType.Human
              ? PlayerType.AI
              : PlayerType.Human,
        },
      };

    case SET_PLAYERA_REMOTE:
      if (state.playerA.type === PlayerType.Remote) return state;
      return {
        ...state,
        playerA: {
          ...state.playerA,
          type: PlayerType.Remote,
        },
      };

    case SET_PLAYERB_REMOTE:
      if (state.playerB.type === PlayerType.Remote) return state;
      return {
        ...state,
        playerB: {
          ...state.playerB,
          type: PlayerType.Remote,
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

    case UPDATE_BOARD:
      if (!action.payload) return state;
      return {
        ...state,
        board: action.payload.board,
        playerA: playerFromBoard(state.playerA, action.payload.board, 0),
        playerB: playerFromBoard(state.playerB, action.payload.board, 1),
        gameAttrs: {
          ...state.gameAttrs,
          boardStr: action.payload.boardStr,
          lastPieceStr: action.payload.lastPieceStr,
          turnStr: action.payload.turnStr,
        },
      };

    default:
      return state;
  }
};

export default gameReducer;
