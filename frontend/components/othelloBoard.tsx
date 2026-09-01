"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import * as m from "motion/react-m";
import { useDispatch, useSelector } from "react-redux";
import { usePathname, useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { IGlobalState } from "@/store/reducers";
import OthelloPiece from "./othelloPiece";
import { boardFromString, playAtPieceIndex } from "@/helpers/gameplay";
import { getApiHost, isProdEnv } from "@/helpers/requests";
import { IPlayer, PlayerType } from "@/types";
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

function PlayerStatus({
  player,
  inverted,
  isToPlay,
  showSkip,
  result,
  onSkip,
  onToggleAi,
}: {
  player: IPlayer;
  inverted: boolean;
  isToPlay: boolean;
  showSkip: boolean;
  result: "winner" | "tie" | null;
  onSkip: () => void;
  onToggleAi: () => void;
}) {
  return (
    <div
      className={`flex items-center gap-1.5 min-w-0 rounded-2xl md:rounded-full px-2.5 py-2 text-xs sm:text-base md:text-2xl ${
        inverted ? "bg-black text-white" : "bg-white text-black"
      }`}
    >
      <div className="min-w-0 flex-1 flex items-center gap-1.5 flex-wrap">
        <span className="font-medium truncate">{player.name}</span>
        <m.span
          key={player.score}
          className="tabular-nums shrink-0"
          initial={{ scale: 1.2, opacity: 0.65 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 520, damping: 28 }}
        >
          ({player.score})
        </m.span>
        {isToPlay && (
          <m.span
            className="shrink-0 text-[10px] sm:text-sm font-semibold uppercase tracking-wide text-emerald-400"
            initial={{ opacity: 0, y: 4, scale: 0.88 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.18 }}
          >
            <span className="sm:hidden">Play</span>
            <span className="hidden sm:inline">To Play</span>
          </m.span>
        )}
        {showSkip && (
          <m.button
            type="button"
            className="text-yellow-500 underline shrink-0"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.16 }}
            onClick={onSkip}
          >
            Skip
          </m.button>
        )}
        {result && (
          <m.span
            className="text-green-500 shrink-0"
            initial={{ opacity: 0, scale: 0.7 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: "spring", stiffness: 380, damping: 18 }}
          >
            {result === "winner" ? "Winner!" : "Tie!"}
          </m.span>
        )}
      </div>
      {player.type !== PlayerType.Remote && (
        <label className="flex items-center gap-1 shrink-0">
          <span className={inverted ? "text-white" : "text-black"}>AI</span>
          <input
            type="checkbox"
            className="form-checkbox h-5 w-5 text-green-500"
            checked={player.type === PlayerType.AI}
            onChange={onToggleAi}
          />
        </label>
      )}
    </div>
  );
}

export default function OthelloBoard({ gameId }: { gameId?: string }) {
  const board = useSelector((state: IGlobalState) => state.board);
  const gameAttrs = useSelector((state: IGlobalState) => state.gameAttrs);
  const playerA = useSelector((state: IGlobalState) => state.playerA);
  const playerB = useSelector((state: IGlobalState) => state.playerB);
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
    <div className="w-full max-w-4xl mx-auto min-w-0">
      <div className="grid grid-cols-1 min-[420px]:grid-cols-2 gap-2 sm:gap-4 min-w-0">
        <PlayerStatus
          player={playerA}
          inverted
          isToPlay={currPlayer === 0}
          showSkip={
            !playerA.hasMove && playerB.hasMove && gameAttrs.turnStr === "0"
          }
          result={
            gameOver && playerA.score > playerB.score
              ? "winner"
              : gameOver && playerA.score === playerB.score
                ? "tie"
                : null
          }
          onSkip={handleTurnToggle}
          onToggleAi={() => dispatch(toggle_playerA_Ai())}
        />
        <PlayerStatus
          player={playerB}
          inverted={false}
          isToPlay={currPlayer === 1}
          showSkip={
            !playerB.hasMove && playerA.hasMove && gameAttrs.turnStr === "1"
          }
          result={
            gameOver && playerB.score > playerA.score
              ? "winner"
              : gameOver && playerB.score === playerA.score
                ? "tie"
                : null
          }
          onSkip={handleTurnToggle}
          onToggleAi={() => dispatch(toggle_playerB_Ai())}
        />
      </div>
      <div className="mt-4 sm:mt-8 w-full max-w-full aspect-square bg-green-700 rounded-2xl p-1.5 sm:p-3 md:p-5 overflow-hidden">
        <div className="grid grid-cols-8 grid-rows-8 gap-1 sm:gap-2 w-full h-full min-w-0">
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
      </div>

      <div className="mt-3 sm:mt-4 w-full flex flex-col gap-2">
        <button
          type="button"
          className="text-left text-base sm:text-lg md:text-2xl underline w-fit min-h-11 py-2"
          onClick={handleReset}
        >
          Reset Game
        </button>
        {waitingForPlayer && (
          <m.p
            className="text-left text-base sm:text-lg md:text-2xl"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.18 }}
          >
            Waiting for player to join...
          </m.p>
        )}
        {!waitingForPlayer && !isRemote && (
          <m.button
            type="button"
            className="text-left text-base sm:text-lg md:text-2xl underline w-fit min-h-11 py-2"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.18 }}
            onClick={handleStartRemoteGame}
          >
            Start Remote Game
          </m.button>
        )}
      </div>
    </div>
  );
}
