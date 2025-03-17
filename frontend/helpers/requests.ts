// make request to api to get the next move

import { ResponseAiMove, IBoard } from "@/types";
import { stringFromBoard } from "./gameplay";

/*
 * Makes a request to the API to get the next move for the given board and player
 * @param board: the current board
 * @param player: 0 for player A, 1 for player B
 * @returns: a promise that resolves to the next move
 */
export async function requestNextMoveFromAi(
  board: IBoard,
  player: 0 | 1
): Promise<ResponseAiMove> {
  try {
    // convert board to string
    const board_str = stringFromBoard(board);
    const is_prod = process.env.NEXT_PUBLIC_IS_PROD?.toLowerCase() == "true";
    const backendUrl = is_prod
      ? process.env.NEXT_PUBLIC_API_URL_PROD
      : process.env.NEXT_PUBLIC_API_URL_DEV;
    const ruleBasedUrl =
      backendUrl + "/next_move/rule_based" + `/${board_str}/${player}`;
    const res = await fetch(ruleBasedUrl, {
      method: "GET",
    });
    const res_json = await res.json();
    console.log(res_json);
    return res_json;
  } catch (err) {
    console.warn(err);
    return { move_index: null };
  }
}
