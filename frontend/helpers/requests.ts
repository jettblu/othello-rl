import { ResponseAiMove, IBoard } from "@/types";
import { stringFromBoard } from "./gameplay";

export function isProdEnv() {
  return process.env.NEXT_PUBLIC_IS_PROD?.toLowerCase() === "true";
}

export function getApiUrl() {
  return isProdEnv()
    ? process.env.NEXT_PUBLIC_API_URL_PROD
    : process.env.NEXT_PUBLIC_API_URL_DEV;
}

export function getApiHost() {
  return isProdEnv()
    ? process.env.NEXT_PUBLIC_API_HOST_PROD
    : process.env.NEXT_PUBLIC_API_HOST_DEV;
}

export async function requestNextMoveFromAi(
  board: IBoard,
  player: 0 | 1,
  signal?: AbortSignal
): Promise<ResponseAiMove> {
  try {
    const board_str = stringFromBoard(board);
    const backendUrl = getApiUrl();
    const res = await fetch(
      `${backendUrl}/next_move/rule_based/${board_str}/${player}`,
      { method: "GET", signal }
    );
    if (!res.ok) return { move_index: null };
    return await res.json();
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") {
      return { move_index: null };
    }
    console.warn(err);
    return { move_index: null };
  }
}
