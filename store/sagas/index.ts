import {
  CallEffect,
  delay,
  put,
  PutEffect,
  select,
  SelectEffect,
  take,
  takeLatest,
} from "redux-saga/effects";
import {
  SET_PLAYERA_CANPLAY,
  SET_PLAYERA_SCORE,
  SET_PLAYERB_CANPLAY,
  SET_PLAYERB_SCORE,
  UPDATE_BOARD,
} from "../actions";
import { IBoardUpdate } from "@/types";
import {
  boardScoreForPlayer,
  playerCanPlay,
  playerScore,
} from "@/helpers/gameplay";

export function* boardSaga(params: {
  type: string;
  payload: IBoardUpdate;
}): Generator<
  | PutEffect<{ type: string; payload: number }>
  | PutEffect<{ type: string; payload: boolean }>
  | SelectEffect
  | CallEffect<true>
> {
  const { board, lastPieceStr, turnStr } = params.payload;
  const newPlayerAScore = playerScore(board, 0);
  const newPlayerBScore = playerScore(board, 1);
  const newACanPlay = playerCanPlay(board, 0);
  const newBCanPlay = playerCanPlay(board, 1);
  // now we need to update the store with the new scores
  yield put({ type: SET_PLAYERA_SCORE, payload: newPlayerAScore });
  yield put({ type: SET_PLAYERB_SCORE, payload: newPlayerBScore });
  yield put({ type: SET_PLAYERA_CANPLAY, payload: newACanPlay });
  yield put({ type: SET_PLAYERB_CANPLAY, payload: newBCanPlay });
}

function* watcherSagas() {
  yield takeLatest(UPDATE_BOARD, boardSaga);
}

export default watcherSagas;
