"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import * as m from "motion/react-m";
import { useDispatch, useSelector } from "react-redux";
import { usePathname, useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { IGlobalState } from "@/store/reducers";
import OthelloPiece from "./othelloPiece";
import {
  boardFromString,
  playAtPieceIndex,
  playerScore,
} from "@/helpers/gameplay";
import {
  preloadAiAgent,
  requestAiMove,
  requestAiValue,
  sideToMoveValueToBlackWin,
  type AiMoveTrace,
} from "@/helpers/aiAgent";
import WinProbability from "./winProbability";
import AiConsole from "./aiConsole";
import { getApiHost, isProdEnv } from "@/helpers/requests";
import {
  createGameSession,
  gameModeFromPlayers,
  recordMove,
  trackAiMoveFailed,
  trackAiToggled,
  trackGameAbandoned,
  trackGameCompleted,
  trackGameStarted,
  trackRemoteGameCreated,
  trackRemoteGameJoined,
  winnerKind,
} from "@/helpers/analytics";
import { CMD, MSG, flag, othelloCmd, sideName } from "@/constants/terminal";
import {
  AI_SIMULATIONS,
  type AiDifficulty,
} from "@/constants/ai";
import { IBoard, IPlayer, PlayerType } from "@/types";
import {
  resetGame,
  setPlayerARemote,
  setPlayerBRemote,
  toggleTurn,
  toggle_playerA_Ai,
  toggle_playerB_Ai,
  updateBoard,
} from "@/store/actions";

interface IRealtimeMove {
  move_index: number;
  player: number;
}

const AI_DIFFICULTY_STORAGE_KEY = "othello-ai-difficulty";
const DESKTOP_AI_MEDIA_QUERY = "(min-width: 768px)";

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
  const side = inverted ? sideName(0) : sideName(1);
  const color = inverted ? "text-p1" : "text-p2";
  const pip = inverted ? "bg-p1" : "bg-p2";
  return (
    <div
      className={`flex items-center gap-1.5 min-w-0 py-1 text-[11px] sm:text-sm ${color} ${
        isToPlay ? "" : "opacity-70"
      }`}
    >
      <span className={`size-2.5 rounded-full shrink-0 ${pip}`} />
      <span className="text-[10px] shrink-0">{side}</span>
      <div className="min-w-0 flex-1 flex items-center gap-1.5 flex-wrap">
        <span className="truncate">{player.name}</span>
        <m.span
          key={player.score}
          className="tabular-nums shrink-0"
          initial={{ scale: 1.2, opacity: 0.65 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 520, damping: 28 }}
        >
          {String(player.score).padStart(2, "0")}
        </m.span>
        {isToPlay && (
          <m.span
            className="shrink-0 text-[10px]"
            initial={{ opacity: 0, y: 4, scale: 0.88 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.18 }}
          >
            *
          </m.span>
        )}
        {showSkip && (
          <m.button
            type="button"
            className="text-crt-amber shrink-0 underline decoration-phosphor/40 underline-offset-2 hover:decoration-amber cursor-pointer"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.16 }}
            onClick={onSkip}
          >
            {CMD.skip}
          </m.button>
        )}
        {result && (
          <m.span
            className="shrink-0 text-[10px] sm:text-xs"
            initial={{ opacity: 0, scale: 0.7 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: "spring", stiffness: 380, damping: 18 }}
          >
            {result === "winner" ? "win" : "tie"}
          </m.span>
        )}
      </div>
      {player.type !== PlayerType.Remote && (
        <button
          type="button"
          className="shrink-0 tabular-nums text-crt-dim hover:text-crt-phosphor min-h-11 sm:min-h-0"
          onClick={onToggleAi}
          aria-pressed={player.type === PlayerType.AI}
        >
          {flag("ai", player.type === PlayerType.AI)}
        </button>
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
  const [loadingAiMove, setLoadingAiMove] = useState(false);
  const [lastAiTrace, setLastAiTrace] = useState<AiMoveTrace | null>(null);
  const [winHistory, setWinHistory] = useState<
    { p: number; board: IBoard; lastPieceStr: string; turnStr: string }[]
  >([]);
  const [reviewIndex, setReviewIndex] = useState<number | null>(null);
  const [aiDifficulty, setAiDifficulty] = useState<AiDifficulty>("easy");
  const aiDifficultyRef = useRef<AiDifficulty>("easy");
  const dispatch = useDispatch();
  const pathName = usePathname();
  const router = useRouter();
  const socketRef = useRef<WebSocket | null>(null);
  const handlePieceSelectionRef = useRef<
    (pieceIndex: number, triggeredByRemote: boolean) => boolean
  >(() => false);
  const seatRef = useRef<"a" | "b" | null>(null);
  const didAnnounceJoin = useRef(false);
  const sessionRef = useRef(createGameSession());
  const pendingAiThinkMsRef = useRef(0);

  const currPlayer: 0 | 1 = gameAttrs.turnStr === "0" ? 0 : 1;
  const isRemote = Boolean(gameId);
  const gameOver = !playerA.hasMove && !playerB.hasMove;
  const reviewing =
    reviewIndex != null && reviewIndex < winHistory.length - 1;
  const view = reviewing ? winHistory[reviewIndex] : null;
  const shownBoard = view?.board ?? board;
  const shownLastPiece = view?.lastPieceStr ?? gameAttrs.lastPieceStr;
  const shownTurn = view?.turnStr ?? gameAttrs.turnStr;
  const shownPlayer: 0 | 1 = shownTurn === "0" ? 0 : 1;

  useEffect(() => {
    const saved = localStorage.getItem(AI_DIFFICULTY_STORAGE_KEY);
    const desktop =
      window.matchMedia?.(DESKTOP_AI_MEDIA_QUERY).matches ?? false;
    const lowCoreCount =
      navigator.hardwareConcurrency > 0 && navigator.hardwareConcurrency <= 4;
    const preferred: AiDifficulty =
      desktop && (saved === "easy" || saved === "hard")
        ? saved
        : desktop && !lowCoreCount
          ? "hard"
          : "easy";
    aiDifficultyRef.current = preferred;
    const timeout = window.setTimeout(() => setAiDifficulty(preferred), 0);
    return () => window.clearTimeout(timeout);
  }, []);

  const handleDifficultyChange = useCallback((difficulty: AiDifficulty) => {
    aiDifficultyRef.current = difficulty;
    setAiDifficulty(difficulty);
    localStorage.setItem(AI_DIFFICULTY_STORAGE_KEY, difficulty);
    setLastAiTrace(null);
  }, []);

  const handlePieceSelection = useCallback(
    (pieceIndex: number, triggeredByRemote: boolean): boolean => {
      const currentTurn: 0 | 1 = gameAttrs.turnStr === "0" ? 0 : 1;

      if (
        !triggeredByRemote &&
        reviewIndex != null &&
        reviewIndex < winHistory.length - 1
      ) {
        setReviewIndex(null);
        return false;
      }
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

      const moverType = currentTurn === 0 ? playerA.type : playerB.type;
      const session = sessionRef.current;
      recordMove(
        session,
        moverType,
        moverType === PlayerType.AI ? pendingAiThinkMsRef.current : 0
      );
      pendingAiThinkMsRef.current = 0;
      if (!session.startedTracked) {
        session.startedTracked = true;
        trackGameStarted(gameModeFromPlayers(playerA.type, playerB.type));
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
      reviewIndex,
      winHistory.length,
    ]
  );

  useEffect(() => {
    handlePieceSelectionRef.current = handlePieceSelection;
  }, [handlePieceSelection]);

  const handleReset = useCallback(() => {
    const session = sessionRef.current;
    if (session.moves > 0 && !session.completedTracked) {
      trackGameAbandoned(
        gameModeFromPlayers(playerA.type, playerB.type),
        session.moves
      );
    }
    sessionRef.current = createGameSession();
    pendingAiThinkMsRef.current = 0;
    setWinHistory([]);
    setReviewIndex(null);
    setLastAiTrace(null);
    router.push("/");
    dispatch(resetGame());
  }, [dispatch, playerA.type, playerB.type, router]);

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
    const storedSeat = sessionStorage.getItem(`othello-seat-${gameId}`);
    if (storedSeat === "a" || storedSeat === "b") {
      seatRef.current = storedSeat;
    }

    function rememberSeat(seat: "a" | "b") {
      seatRef.current = seat;
      sessionStorage.setItem(`othello-seat-${gameId}`, seat);
    }

    function applyHostSeat(occupants = 1) {
      rememberSeat("a");
      if (occupants >= 2) {
        dispatch(setPlayerBRemote());
        setWaitingForPlayer(false);
      } else {
        setWaitingForPlayer(true);
      }
    }

    function applyGuestSeat() {
      rememberSeat("b");
      dispatch(setPlayerARemote());
      setWaitingForPlayer(false);
      if (!didAnnounceJoin.current) {
        didAnnounceJoin.current = true;
        trackRemoteGameJoined();
        toast.success(MSG.seatB);
      }
    }

    ws.onopen = () => {
      ws.send(`/join ${gameId}`);
    };

    ws.onmessage = (event) => {
      const raw = String(event.data);
      let data: {
        type?: string;
        seat?: string;
        occupants?: number;
        move_index?: number;
      };
      try {
        data = JSON.parse(raw);
      } catch {
        data = {};
      }

      if (data.type === "joined") {
        const seat =
          seatRef.current ?? (data.seat === "b" ? "b" : "a");
        if (seat === "b") applyGuestSeat();
        else applyHostSeat(data.occupants ?? 1);
        return;
      }
      if (data.type === "peer_joined" || raw.includes("Someone joined")) {
        if (seatRef.current === "b") {
          setWaitingForPlayer(false);
          return;
        }
        applyHostSeat(2);
        if (raw.includes("Someone joined")) {
          ws.send("you are player b");
        }
        if (!didAnnounceJoin.current) {
          didAnnounceJoin.current = true;
          toast.success(MSG.peerJoined);
        }
        return;
      }
      if (data.type === "peer_left" || raw.includes("Someone disconnected")) {
        didAnnounceJoin.current = false;
        setWaitingForPlayer(true);
        toast.error(MSG.peerLeft);
        return;
      }
      if (raw.includes("you are player b")) {
        if (seatRef.current === "a") return;
        applyGuestSeat();
        return;
      }
      if (data.move_index != null || raw.includes("move_index")) {
        const move: IRealtimeMove =
          data.move_index != null
            ? { move_index: data.move_index, player: 0 }
            : JSON.parse(raw);
        handlePieceSelectionRef.current(move.move_index, true);
      }
    };

    ws.onclose = () => {
      toast.error(MSG.remoteClosed);
    };

    return () => {
      ws.onclose = null;
      ws.close();
      socketRef.current = null;
    };
  }, [dispatch, gameId]);

  useEffect(() => {
    const append = (pA: number) => {
      const sample = {
        p: pA,
        board: [...board] as IBoard,
        lastPieceStr: gameAttrs.lastPieceStr,
        turnStr: gameAttrs.turnStr,
      };
      setWinHistory((history) =>
        gameAttrs.lastPieceStr === "-" ? [sample] : [...history, sample]
      );
    };

    if (gameOver) {
      append(
        playerA.score === playerB.score
          ? 0.5
          : playerA.score > playerB.score
            ? 1
            : 0
      );
      return;
    }

    const controller = new AbortController();
    const player = currPlayer;
    (async () => {
      try {
        const value = await requestAiValue(board, player, controller.signal);
        if (controller.signal.aborted || value == null) return;
        append(sideToMoveValueToBlackWin(value, player));
      } catch (err) {
        console.warn("Win probability evaluate failed", err);
      }
    })();

    return () => controller.abort();
  }, [
    board,
    currPlayer,
    gameAttrs.lastPieceStr,
    gameOver,
    playerA.score,
    playerB.score,
  ]);

  useEffect(() => {
    const isAiTurn =
      (playerA.type === PlayerType.AI && gameAttrs.turnStr === "0") ||
      (playerB.type === PlayerType.AI && gameAttrs.turnStr === "1");
    if (!isAiTurn || gameOver) return;

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
      const start = Date.now();
      try {
        const desktop =
          window.matchMedia?.(DESKTOP_AI_MEDIA_QUERY).matches ?? false;
        const difficulty = desktop ? aiDifficultyRef.current : "easy";
        const trace = await requestAiMove(
          board,
          player,
          AI_SIMULATIONS[difficulty],
          controller.signal
        );
        if (controller.signal.aborted || trace == null || trace.index < 0) return;
        const elapsed = Date.now() - start;
        pendingAiThinkMsRef.current = elapsed;
        setLastAiTrace(trace);
        handlePieceSelectionRef.current(trace.index, false);
      } catch (err) {
        if (!controller.signal.aborted) {
          console.warn(err);
          trackAiMoveFailed();
          toast.error(MSG.mctsFailed);
        }
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
    gameOver,
    handleTurnToggle,
    playerA.hasMove,
    playerA.type,
    playerB.hasMove,
    playerB.type,
  ]);

  useEffect(() => {
    if (!gameOver) return;
    const session = sessionRef.current;
    if (session.completedTracked || session.moves === 0) return;
    session.completedTracked = true;
    const winnerScore = Math.max(playerA.score, playerB.score);
    const loserScore = Math.min(playerA.score, playerB.score);
    trackGameCompleted({
      mode: gameModeFromPlayers(playerA.type, playerB.type),
      winner: winnerKind(
        playerA.score,
        playerB.score,
        playerA.type,
        playerB.type
      ),
      winnerScore,
      loserScore,
      totalMoves: session.moves,
      aiMoves: session.aiMoves,
      aiThinkMs: session.aiThinkMs,
    });
  }, [
    gameOver,
    playerA.score,
    playerA.type,
    playerB.score,
    playerB.type,
  ]);

  function handleStartRemoteGame() {
    const newGameId = Math.random().toString(36).substring(2, 10);
    const params = new URLSearchParams({
      board: gameAttrs.boardStr,
      turn: gameAttrs.turnStr,
      lastPiece: gameAttrs.lastPieceStr,
    });
    const remotePath = `/live/${newGameId}?${params.toString()}`;
    const shareUrl = new URL(remotePath, window.location.origin).toString();
    sessionStorage.setItem(`othello-seat-${newGameId}`, "a");
    void navigator.clipboard.writeText(shareUrl).then(
      () => toast.success(MSG.copiedUrl),
      () => toast.error(MSG.copyFailed)
    );
    trackRemoteGameCreated();
    router.push(remotePath);
  }

  return (
    <div className="w-full max-w-4xl mx-auto h-full min-h-0 min-w-0 flex flex-col pt-2 sm:pt-3">
      <div className="shrink-0 pb-1">
        <h1 className="text-xs sm:text-sm text-crt-phosphor">
          {othelloCmd(isRemote)}
        </h1>
      </div>
      <div className="grid grid-cols-1 min-[420px]:grid-cols-2 gap-x-4 min-w-0 shrink-0">
        <PlayerStatus
          player={
            view ? { ...playerA, score: playerScore(view.board, 0) } : playerA
          }
          inverted
          isToPlay={shownPlayer === 0}
          showSkip={
            !reviewing &&
            !playerA.hasMove &&
            playerB.hasMove &&
            gameAttrs.turnStr === "0"
          }
          result={
            gameOver && playerA.score > playerB.score
              ? "winner"
              : gameOver && playerA.score === playerB.score
                ? "tie"
                : null
          }
          onSkip={handleTurnToggle}
          onToggleAi={() => {
            preloadAiAgent();
            trackAiToggled(playerA.type !== PlayerType.AI);
            dispatch(toggle_playerA_Ai());
          }}
        />
        <PlayerStatus
          player={
            view ? { ...playerB, score: playerScore(view.board, 1) } : playerB
          }
          inverted={false}
          isToPlay={shownPlayer === 1}
          showSkip={
            !reviewing &&
            !playerB.hasMove &&
            playerA.hasMove &&
            gameAttrs.turnStr === "1"
          }
          result={
            gameOver && playerB.score > playerA.score
              ? "winner"
              : gameOver && playerB.score === playerA.score
                ? "tie"
                : null
          }
          onSkip={handleTurnToggle}
          onToggleAi={() => {
            preloadAiAgent();
            trackAiToggled(playerB.type !== PlayerType.AI);
            dispatch(toggle_playerB_Ai());
          }}
        />
      </div>
      <WinProbability
        history={winHistory.map((sample) => sample.p)}
        cursor={reviewIndex}
        onCursor={setReviewIndex}
      />
      <div className="flex-1 min-h-0 w-full min-w-0 my-1.5 sm:my-2 [container-type:size] grid place-items-center">
        <div className="crt-screen aspect-square w-[min(100cqw,100cqh)] overflow-hidden">
          <div className="arcade-felt crt-glass w-full h-full p-1 sm:p-2 md:p-2.5 overflow-hidden">
            <div className="grid grid-cols-8 grid-rows-8 gap-1 sm:gap-1.5 w-full h-full min-w-0">
              {shownBoard.map((player, index) => (
                <OthelloPiece
                  key={index}
                  pieceIndex={index}
                  playerIndex={player}
                  handlePieceSelection={handlePieceSelection}
                  wasLastMove={index === Number(shownLastPiece)}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="w-full shrink-0 flex flex-wrap items-center gap-x-4 gap-y-0 text-xs sm:text-sm text-crt-dim">
        <button
          type="button"
          className="text-left w-fit min-h-11 py-1 text-crt-phosphor underline decoration-phosphor/45 underline-offset-[3px] hover:text-crt-amber hover:decoration-amber cursor-pointer"
          onClick={handleReset}
        >
          {CMD.reset}
        </button>
        {waitingForPlayer && (
          <m.p
            className="text-left"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.18 }}
          >
            {CMD.remote}
            <span className="tui-cursor" aria-hidden />
          </m.p>
        )}
        {!waitingForPlayer && !isRemote && (
          <m.button
            type="button"
            className="text-left w-fit min-h-11 py-1 text-crt-phosphor underline decoration-phosphor/45 underline-offset-[3px] hover:text-crt-amber hover:decoration-amber cursor-pointer"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.18 }}
            onClick={handleStartRemoteGame}
          >
            {CMD.remote}
          </m.button>
        )}
        {(playerA.type === PlayerType.AI || playerB.type === PlayerType.AI) && (
          <button
            type="button"
            className="desktop-ai-difficulty text-left w-fit min-h-11 py-1 text-crt-phosphor underline decoration-phosphor/45 underline-offset-[3px] hover:text-crt-amber hover:decoration-amber cursor-pointer"
            onClick={() =>
              handleDifficultyChange(
                aiDifficulty === "easy" ? "hard" : "easy"
              )
            }
            aria-label={`AI difficulty ${aiDifficulty}; activate the other level`}
          >
            {CMD.level} --{aiDifficulty}
          </button>
        )}
      </div>
      <AiConsole
        active={
          playerA.type === PlayerType.AI || playerB.type === PlayerType.AI
        }
        thinking={loadingAiMove}
        trace={lastAiTrace}
      />
    </div>
  );
}
