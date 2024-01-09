// make request to api to get the next move

import { ResponseAiMove, IBoard } from "@/types";
import { stringFromBoard } from "./gameplay";
import { DEFAULT_BACKEND_URL } from "@/constants";

/*
 * Makes a request to the API to get the next move for the given board and player
 * @param board: the current board
 * @param player: 0 for player A, 1 for player B
 * @returns: a promise that resolves to the next move
 */
export function requestNextMoveFromAi(
  board: IBoard,
  player: 0 | 1
): Promise<ResponseAiMove> {
  // convert board to string
  const board_str = stringFromBoard(board);
  const ruleBasedUrl = DEFAULT_BACKEND_URL + "/next_move/rule_based";
  return fetch(ruleBasedUrl, {
    method: "POST",
    body: JSON.stringify({ board: board_str, player_to_play: player }),
  }).then((res) => res.json());
}
