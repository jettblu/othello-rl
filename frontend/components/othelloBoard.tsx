"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { usePathname, useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { IGlobalState } from "@/store/reducers";
import OthelloPiece from "./othelloPiece";
import { boardFromString, playAtPieceIndex } from "@/helpers/gameplay";
import { getApiHost, isProdEnv, requestNextMoveFromAi } from "@/helpers/requests";
import { PlayerType } from "@/types";
import {
  resetGame,
  toggleTurn,
  toggle_PlayerA_Remote,
  toggle_PlayerB_Remote,
  toggle_playerA_Ai,
  toggle_playerB_Ai,
  updateBoard,
} from "@/store/actions";

interface IRealtimeMove {
  move_index: number;
  player: number;
}

function replaceQuery(pathname: string, updates: Record<string, string>) {
  const params = new URLSearchParams(window.location.search);
  for (const [key, value] of Object.entries(updates)) {
    if (value) params.set(key, value);
    else params.delete(key);
  }
  const query = params.toString();
  window.history.replaceState(
    null,
    "",
    query ? `${pathname}?${query}` : pathname
  );
}

export default function OthelloBoard({ gameId }: { gameId?: string }) {
  const { board, gameAttrs, playerA, playerB } = useSelector(
    (state: IGlobalState) => state
  );
  const [secondsForLastAiMove, setSecondsForLastAiMove] = useState(0);
  const [loadingAiMove, setLoadingAiMove] = useState(false);
  const [waitingForPlayer, setWaitingForPlayer] = useState(() => Boolean(gameId));
  const dispatch = useDispatch();
  const pathName = usePathname();
  const router = useRouter();
  const socketRef = useRef<WebSocket | null>(null);

  const currPlayer: 0 | 1 = gameAttrs.turnStr === "0" ? 0 : 1;
  const isRemote = Boolean(gameId);
  const gameOver = !playerA.hasMove && !playerB.hasMove;

  const handlePieceSelection = useCallback(
    (pieceIndex: number, triggeredByRemote: boolean): boolean => {
      const currentTurn: 0 | 1 = gameAttrs.turnStr === "0" ? 0 : 1;

      if (
        isRemote &&
        playerA.type !== PlayerType.Remote &&
        playerB.type !== PlayerType.Remote
      ) {
        return false;
      }
      if (
        triggeredByRemote &&
        currentTurn === 0 &&
        playerA.type !== PlayerType.Remote
      ) {
        return false;
      }
      if (
        triggeredByRemote &&
        currentTurn === 1 &&
        playerB.type !== PlayerType.Remote
      ) {
        return false;
      }
      if (
        (!triggeredByRemote &&
          currentTurn === 0 &&
          playerA.type === PlayerType.Remote) ||
        (!triggeredByRemote &&
          currentTurn === 1 &&
          playerB.type === PlayerType.Remote)
      ) {
        return false;
      }

      const res = playAtPieceIndex(board, pieceIndex, currentTurn);
      if (!res) return false;

      replaceQuery(pathName, {
        board: res.boardStr,
        turn: res.turnStr,
        lastPiece: res.lastPieceStr,
      });

      if (isRemote) {
        const move: IRealtimeMove = {
          move_index: pieceIndex,
          player: currentTurn,
        };
        socketRef.current?.send(JSON.stringify(move));
      }

      dispatch(updateBoard(res));
      return true;
    },
    [
      board,
      dispatch,
      gameAttrs.turnStr,
      isRemote,
      pathName,
      playerA.type,
      playerB.type,
    ]
  );

  const handleReset = useCallback(() => {
    router.push("/");
    dispatch(resetGame());
  }, [dispatch, router]);

  const handleTurnToggle = useCallback(() => {
    const nextTurn = gameAttrs.turnStr === "0" ? "1" : "0";
    replaceQuery(pathName, { turn: nextTurn });
    dispatch(toggleTurn());
  }, [dispatch, gameAttrs.turnStr, pathName]);

  useEffect(() => {
    const queryParams = new URLSearchParams(window.location.search);
    const boardStr = queryParams.get("board");
    const turnStr = queryParams.get("turn");
    const lastPieceStr = queryParams.get("lastPiece");
    if (boardStr && turnStr && lastPieceStr) {
      dispatch(
        updateBoard({
          boardStr,
          turnStr,
          lastPieceStr,
          board: boardFromString(boardStr),
        })
      );
    }
  }, [dispatch]);

  useEffect(() => {
    const isAiTurn =
      (playerA.type === PlayerType.AI && gameAttrs.turnStr === "0") ||
      (playerB.type === PlayerType.AI && gameAttrs.turnStr === "1");
    if (!isAiTurn) return;

    if (gameAttrs.turnStr === "0" && !playerA.hasMove) {
      if (playerB.hasMove) handleTurnToggle();
      return;
    }
    if (gameAttrs.turnStr === "1" && !playerB.hasMove) {
      if (playerA.hasMove) handleTurnToggle();
      return;
    }

    const controller = new AbortController();
    const player: 0 | 1 = gameAttrs.turnStr === "0" ? 0 : 1;

    (async () => {
      setLoadingAiMove(true);
      const startTime = Date.now();
      try {
        const res = await requestNextMoveFromAi(board, player, controller.signal);
        if (controller.signal.aborted || res.move_index == null) return;
        const timeTaken = Date.now() - startTime;
        if (timeTaken < 500) {
          await new Promise((resolve) => setTimeout(resolve, 500 - timeTaken));
        }
        if (controller.signal.aborted) return;
        setSecondsForLastAiMove(Math.round(timeTaken / 10) / 100);
        handlePieceSelection(res.move_index, false);
      } finally {
        if (!controller.signal.aborted) setLoadingAiMove(false);
      }
    })();

    return () => {
      controller.abort();
      setLoadingAiMove(false);
    };
  }, [
    board,
    gameAttrs.turnStr,
    handlePieceSelection,
    handleTurnToggle,
    playerA.hasMove,
    playerA.type,
    playerB.hasMove,
    playerB.type,
  ]);

  useEffect(() => {
    if (!gameId) return;

    const proto = isProdEnv() ? "wss" : "ws";
    const host = getApiHost();
    const ws = new WebSocket(`${proto}://${host}/ws`);
    socketRef.current = ws;

    ws.onopen = () => {
      ws.send(`/join ${gameId}`);
    };

    ws.onmessage = (event) => {
      const newMsg = String(event.data);
      if (newMsg.includes("Someone joined")) {
        ws.send("you are player b");
        dispatch(toggle_PlayerB_Remote());
        setWaitingForPlayer(false);
        toast.success("Another player has joined the game!");
        return;
      }
      if (newMsg.includes("Someone disconnected")) {
        setWaitingForPlayer(true);
        toast.error("Other player disconnected");
        handleReset();
        return;
      }
      if (newMsg.includes("you are player b")) {
        toast.success("You are player b!");
        setWaitingForPlayer(false);
        dispatch(toggle_PlayerA_Remote());
        return;
      }
      if (newMsg.includes("move_index")) {
        const move: IRealtimeMove = JSON.parse(newMsg);
        handlePieceSelection(move.move_index, true);
      }
    };

    ws.onclose = () => {
      toast.error("Disconnected from game");
    };

    return () => {
      ws.onclose = null;
      ws.close();
      socketRef.current = null;
    };
  }, [dispatch, gameId, handlePieceSelection, handleReset]);

  function handleStartRemoteGame() {
    const newGameId = Math.random().toString(36).substring(2, 10);
    navigator.clipboard.writeText(`${window.location.origin}/live/${newGameId}`);
    toast.success("Copied game link to clipboard");
    router.push(`/live/${newGameId}`);
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="grid grid-cols-2 h-fit max-w-4xl mx-auto gap-x-4 text-lg md:text-2xl">
        <div className="flex flex-row bg-black text-white rounded-full px-3 py-2">
          {playerA.name} ({playerA.score}) {currPlayer === 0 ? "To Play" : ""}
          {!playerA.hasMove && playerB.hasMove && gameAttrs.turnStr === "0" && (
            <p
              className="text-yellow-500 underline hover:cursor-pointer ml-3"
              onClick={handleTurnToggle}
            >
              Skip Turn
            </p>
          )}
          {gameOver && playerA.score > playerB.score && (
            <p className="text-green-500 ml-3">Winner!</p>
          )}
          {gameOver && playerA.score === playerB.score && (
            <p className="text-green-500 ml-3">Tie!</p>
          )}
          {playerA.type !== PlayerType.Remote && (
            <div className="flex-grow">
              <div className="flex flex-row-reverse">
                <input
                  type="checkbox"
                  className="form-checkbox h-5 w-5 text-green-500 my-auto"
                  checked={playerA.type === PlayerType.AI}
                  onChange={() => dispatch(toggle_playerA_Ai())}
                />
                <p className="text-white mr-2">AI</p>
              </div>
            </div>
          )}
        </div>
        <div className="flex flex-row bg-white rounded-full px-3 py-2">
          {playerB.name} ({playerB.score}) {currPlayer === 1 ? "To Play" : ""}
          {!playerB.hasMove && playerA.hasMove && gameAttrs.turnStr === "1" && (
            <p
              className="text-yellow-500 underline hover:cursor-pointer ml-3"
              onClick={handleTurnToggle}
            >
              Skip Turn
            </p>
          )}
          {gameOver && playerB.score > playerA.score && (
            <p className="text-green-500 ml-3">Winner!</p>
          )}
          {gameOver && playerB.score === playerA.score && (
            <p className="text-green-500 ml-3">Tie!</p>
          )}
          {playerB.type !== PlayerType.Remote && (
            <div className="flex-grow">
              <div className="flex flex-row-reverse">
                <input
                  type="checkbox"
                  className="form-checkbox h-5 w-5 text-green-500 my-auto"
                  checked={playerB.type === PlayerType.AI}
                  onChange={() => dispatch(toggle_playerB_Ai())}
                />
                <p className="text-black mr-2">AI</p>
              </div>
            </div>
          )}
        </div>
      </div>
      <div className="bg-green-700 rounded-2xl grid grid-cols-8 gap-x-2 gap-y-2 mt-8 px-3 py-5">
        {board.map((player, index) => (
          <OthelloPiece
            key={index}
            pieceIndex={index}
            playerIndex={player}
            handlePieceSelection={handlePieceSelection}
            wasLastMove={index === Number(gameAttrs.lastPieceStr)}
          />
        ))}
      </div>

      <div className="w-full flex flex-col">
        <div className="w-full flex flex-row">
          <p
            className="text-left text-lg md:text-2xl underline hover:cursor-pointer"
            onClick={handleReset}
          >
            Reset Game
          </p>
          <div className="flex-grow">
            {loadingAiMove && (
              <div className="flex flex-row-reverse">
                <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-green-500"></div>
                <span className="text-lg mr-2 text-center text-gray-500">
                  AI is thinking...
                </span>
              </div>
            )}
            {!loadingAiMove && secondsForLastAiMove > 0 && (
              <div className="flex flex-row-reverse">
                <span className="text-lg mr-2 text-center text-gray-500">
                  AI took {secondsForLastAiMove} seconds
                </span>
              </div>
            )}
          </div>
        </div>
        {waitingForPlayer && (
          <div className="w-full flex flex-row">
            <p className="text-left text-lg md:text-2xl">
              Waiting for player to join...
            </p>
          </div>
        )}
        {!waitingForPlayer && !isRemote && (
          <div className="w-full flex flex-row">
            <p
              className="text-left text-lg md:text-2xl underline hover:cursor-pointer"
              onClick={handleStartRemoteGame}
            >
              Start Remote Game
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
