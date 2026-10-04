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
  squareFromPieceIndex,
} from "@/helpers/gameplay";
import {
  advanceAiSearchTree,
  preloadAiAgent,
  requestAiMove,
  requestMctsTrace,
  requestAiValue,
  resetAiSearchTree,
  sideToMoveValueToBlackWin,
} from "@/helpers/aiAgent";
import { cancelUrlSync, replaceQuery } from "@/helpers/urlSync";
import WinProbability from "./winProbability";
import AiLevelToggle from "./aiLevelToggle";
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
  type GameSession,
} from "@/helpers/analytics";
import {
  appendGameLogPly,
  buildGameLogPayload,
  createGameLogSession,
  dropGameLogPlies,
  gameModeCode,
  snapshotAiDifficulties,
  submitGameLog,
  type GameLogSession,
} from "@/helpers/gameLog";
import { CMD, MSG, flag, othelloCmd, sideName } from "@/constants/terminal";
import { type AiDifficulty } from "@/constants/ai";
import {
  loadAiDifficultyByPlayer,
  persistAiDifficulty,
  simulationsFor,
  type AiDifficultyByPlayer,
} from "@/helpers/aiDifficulty";
import {
  gradeTone,
  marksFromReview,
  reviewFromTrace,
  type MoveReview,
  type ReviewMark,
  type ReviewTone,
} from "@/helpers/moveReview";
import {
  loadShowDetails,
  persistShowDetails,
} from "@/helpers/gamePreferences";
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


/** Minimum wall-clock time between consecutive AI turns, moves and endgame passes. */
const AI_TURN_MIN_INTERVAL_MS = 80;

// One paced tick per AI turn
function paceAiTurn(signal: AbortSignal, holdMs = AI_TURN_MIN_INTERVAL_MS) {
  return new Promise<void>((resolve) => {
    const timer = window.setTimeout(resolve, holdMs);
    signal.addEventListener(
      "abort",
      () => {
        window.clearTimeout(timer);
        resolve();
      },
      { once: true }
    );
  });
}

function PlayerStatus({
  player,
  inverted,
  isToPlay,
  showSkip,
  result,
  onSkip,
  onToggleAi,
  aiLevel,
  onAiLevelChange,
}: {
  player: IPlayer;
  inverted: boolean;
  isToPlay: boolean;
  showSkip: boolean;
  result: "winner" | "tie" | null;
  onSkip: () => void;
  onToggleAi: () => void;
  aiLevel?: AiDifficulty;
  onAiLevelChange?: (level: AiDifficulty) => void;
}) {
  const side = inverted ? sideName(0) : sideName(1);
  const sideKey = inverted ? ("grn" as const) : ("amb" as const);
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
      <div className="shrink-0 flex items-center justify-end gap-1.5 min-w-[6.75rem] sm:min-w-[7.25rem]">
        {player.type !== PlayerType.Remote && (
          <button
            type="button"
            className="tabular-nums text-crt-dim hover:text-crt-phosphor min-h-11 sm:min-h-0"
            onClick={onToggleAi}
            aria-pressed={player.type === PlayerType.AI}
          >
            {flag("ai", player.type === PlayerType.AI)}
          </button>
        )}
        {player.type === PlayerType.AI && aiLevel && onAiLevelChange ? (
          <AiLevelToggle
            side={sideKey}
            value={aiLevel}
            onChange={onAiLevelChange}
          />
        ) : (
          <span className="inline-block w-[4.75rem] h-7 shrink-0" aria-hidden />
        )}
      </div>
    </div>
  );
}

type WinSample = {
  p: number;
  board: IBoard;
  lastPieceStr: string;
  turnStr: string;
};

function isPlayedStep(prev: WinSample, curr: WinSample) {
  return curr.lastPieceStr !== "-" && curr.lastPieceStr !== prev.lastPieceStr;
}

function playedPliesAfter(history: WinSample[], index: number) {
  let count = 0;
  for (let i = index + 1; i < history.length; i++) {
    if (isPlayedStep(history[i - 1], history[i])) count += 1;
  }
  return count;
}

function emptyMarks(prev: Map<number, ReviewMark>) {
  return prev.size === 0 ? prev : new Map<number, ReviewMark>();
}

function logPly(
  session: GameSession,
  log: GameLogSession,
  input: {
    pieceIndex: number;
    thinkMs: number;
    moverType: PlayerType;
    aiThinkMs: number;
    typeA: PlayerType;
    typeB: PlayerType;
    levels: AiDifficultyByPlayer;
  }
) {
  snapshotAiDifficulties(log, input.typeA, input.typeB, input.levels);
  appendGameLogPly(log, input.pieceIndex, input.thinkMs);
  recordMove(session, input.moverType, input.aiThinkMs);
  if (!session.startedTracked) {
    session.startedTracked = true;
    trackGameStarted(gameModeFromPlayers(input.typeA, input.typeB));
  }
}

function branchAt(
  history: WinSample[],
  reviewIndex: number,
  pieceIndex: number,
  replacePlayed: boolean
) {
  const shown = history[reviewIndex];
  const before = reviewIndex > 0 ? history[reviewIndex - 1] : null;
  const onBoard = (sample: WinSample | null | undefined) =>
    sample != null &&
    playAtPieceIndex(
      sample.board,
      pieceIndex,
      sample.turnStr === "0" ? 0 : 1
    ) != null;
  if (replacePlayed && onBoard(before)) return reviewIndex - 1;
  if (onBoard(shown)) return reviewIndex;
  if (onBoard(before)) return reviewIndex - 1;
  return null;
}

function samePosition(a: WinSample, b: WinSample) {
  return (
    a.turnStr === b.turnStr &&
    a.lastPieceStr === b.lastPieceStr &&
    a.board.length === b.board.length &&
    a.board.every((piece, index) => piece === b.board[index])
  );
}

export default function OthelloBoard({ gameId }: { gameId?: string }) {
  const board = useSelector((state: IGlobalState) => state.board);
  const gameAttrs = useSelector((state: IGlobalState) => state.gameAttrs);
  const playerA = useSelector((state: IGlobalState) => state.playerA);
  const playerB = useSelector((state: IGlobalState) => state.playerB);
  const [waitingForPlayer, setWaitingForPlayer] = useState(() => Boolean(gameId));
  const [loadingAiMove, setLoadingAiMove] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [winHistory, setWinHistory] = useState<WinSample[]>([]);
  const [reviewIndex, setReviewIndex] = useState<number | null>(null);
  const [reviewLine, setReviewLine] = useState<string | null>(null);
  const [reviewTone, setReviewTone] = useState<ReviewTone | "pending">("pending");
  const [reviewMarks, setReviewMarks] = useState<Map<number, ReviewMark>>(
    () => new Map()
  );
  const [pendingBranch, setPendingBranch] = useState<{
    at: number;
    pieceIndex: number;
  } | null>(null);
  const reviewCacheRef = useRef(new Map<string, MoveReview>());
  const reviewGenRef = useRef(0);
  const [aiDifficulty, setAiDifficulty] = useState<AiDifficultyByPlayer>({
    0: "easy",
    1: "easy",
  });
  const aiDifficultyRef = useRef<AiDifficultyByPlayer>({ 0: "easy", 1: "easy" });
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
  const gameLogRef = useRef(createGameLogSession());
  const lastPlyAtRef = useRef(0);
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
    lastPlyAtRef.current = Date.now();
    const loaded = loadAiDifficultyByPlayer();
    aiDifficultyRef.current = loaded;
    const details = loadShowDetails();
    const timeout = window.setTimeout(() => {
      setAiDifficulty(loaded);
      setShowDetails(details);
    }, 0);
    return () => window.clearTimeout(timeout);
  }, []);

  const handleDetailsToggle = useCallback(() => {
    setShowDetails((on) => {
      const next = !on;
      persistShowDetails(next);
      if (!next) {
        setPendingBranch(null);
        setReviewIndex(null);
      }
      if (next) preloadAiAgent();
      return next;
    });
  }, []);

  const handleReviewCursor = useCallback((index: number | null) => {
    setPendingBranch(null);
    setReviewIndex(index);
  }, []);

  const handleDifficultyChange = useCallback((player: 0 | 1, difficulty: AiDifficulty) => {
    aiDifficultyRef.current = {
      ...aiDifficultyRef.current,
      [player]: difficulty,
    };
    setAiDifficulty({ ...aiDifficultyRef.current });
    persistAiDifficulty(player, difficulty);
    void resetAiSearchTree();
  }, []);

  const handlePieceSelection = useCallback(
    (pieceIndex: number, triggeredByRemote: boolean): boolean => {
      const currentTurn: 0 | 1 = gameAttrs.turnStr === "0" ? 0 : 1;

      if (
        !triggeredByRemote &&
        reviewIndex != null &&
        reviewIndex < winHistory.length - 1
      ) {
        if (isRemote || !showDetails) {
          setReviewIndex(null);
          return false;
        }
        const at = branchAt(
          winHistory,
          reviewIndex,
          pieceIndex,
          reviewMarks.get(pieceIndex)?.kind === "better"
        );
        if (at != null) {
          setPendingBranch({ at, pieceIndex });
          return true;
        }
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

      void advanceAiSearchTree(pieceIndex);

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
      const thinkMs =
        moverType === PlayerType.AI
          ? pendingAiThinkMsRef.current
          : Date.now() - lastPlyAtRef.current;
      logPly(session, gameLogRef.current, {
        pieceIndex,
        thinkMs,
        moverType,
        aiThinkMs:
          moverType === PlayerType.AI ? pendingAiThinkMsRef.current : 0,
        typeA: playerA.type,
        typeB: playerB.type,
        levels: aiDifficultyRef.current,
      });
      lastPlyAtRef.current = Date.now();
      pendingAiThinkMsRef.current = 0;

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
      reviewMarks,
      showDetails,
      winHistory,
    ]
  );

  useEffect(() => {
    handlePieceSelectionRef.current = handlePieceSelection;
  }, [handlePieceSelection]);

  const confirmBranch = useCallback(() => {
    if (isRemote || pendingBranch == null) return;
    const sample = winHistory[pendingBranch.at];
    if (!sample) return;
    const turn: 0 | 1 = sample.turnStr === "0" ? 0 : 1;
    const played = playAtPieceIndex(sample.board, pendingBranch.pieceIndex, turn);
    if (!played) return;

    const dropped = playedPliesAfter(winHistory, pendingBranch.at);
    dropGameLogPlies(gameLogRef.current, dropped);
    const session = sessionRef.current;
    session.moves = Math.max(0, session.moves - dropped);
    session.humanMoves = Math.min(session.humanMoves, session.moves);
    session.aiMoves = Math.min(session.aiMoves, session.moves);
    session.remoteMoves = Math.min(session.remoteMoves, session.moves);
    session.completedTracked = false;
    const moverType = turn === 0 ? playerA.type : playerB.type;
    logPly(session, gameLogRef.current, {
      pieceIndex: pendingBranch.pieceIndex,
      thinkMs: 0,
      moverType,
      aiThinkMs: 0,
      typeA: playerA.type,
      typeB: playerB.type,
      levels: aiDifficultyRef.current,
    });
    lastPlyAtRef.current = Date.now();
    pendingAiThinkMsRef.current = 0;

    setWinHistory(winHistory.slice(0, pendingBranch.at + 1));
    setReviewIndex(null);
    setPendingBranch(null);
    void resetAiSearchTree();
    replaceQuery(pathName, {
      board: played.boardStr,
      turn: played.turnStr,
      lastPiece: played.lastPieceStr,
    });
    dispatch(updateBoard(played));
  }, [
    dispatch,
    isRemote,
    pathName,
    pendingBranch,
    playerA.type,
    playerB.type,
    winHistory,
  ]);

  const handleReset = useCallback(() => {
    const session = sessionRef.current;
    if (session.moves > 0 && !session.completedTracked) {
      trackGameAbandoned(
        gameModeFromPlayers(playerA.type, playerB.type),
        session.moves
      );
    }
    sessionRef.current = createGameSession();
    gameLogRef.current = createGameLogSession();
    lastPlyAtRef.current = Date.now();
    pendingAiThinkMsRef.current = 0;
    setWinHistory([]);
    setReviewIndex(null);
    setPendingBranch(null);
    reviewCacheRef.current.clear();
    void resetAiSearchTree();
    cancelUrlSync();
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
    if (!showDetails) return;

    const append = (pA: number) => {
      const sample = {
        p: pA,
        board: [...board] as IBoard,
        lastPieceStr: gameAttrs.lastPieceStr,
        turnStr: gameAttrs.turnStr,
      };
      setWinHistory((history) => {
        const prev = history[history.length - 1];
        if (prev && samePosition(prev, sample)) return history;
        return gameAttrs.lastPieceStr === "-" ? [sample] : [...history, sample];
      });
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
    showDetails,
  ]);

  useEffect(() => {
    const isAiTurn =
      (playerA.type === PlayerType.AI && gameAttrs.turnStr === "0") ||
      (playerB.type === PlayerType.AI && gameAttrs.turnStr === "1");
    if (!isAiTurn || gameOver) return;

    const toMove = gameAttrs.turnStr === "0" ? 0 : 1;
    const moverHasMove = toMove === 0 ? playerA.hasMove : playerB.hasMove;
    const opponentHasMove = toMove === 0 ? playerB.hasMove : playerA.hasMove;

    if (!moverHasMove) {
      // Endgame pass — pace it like a move to keep all-AI cadence.
      if (!opponentHasMove) return;
      const controller = new AbortController();
      (async () => {
        await paceAiTurn(controller.signal);
        if (!controller.signal.aborted) handleTurnToggle();
      })();
      return () => controller.abort();
    }

    const controller = new AbortController();

    (async () => {
      setLoadingAiMove(true);
      const start = Date.now();
      try {
        const sims = simulationsFor(toMove, aiDifficultyRef.current);
        const trace = await requestAiMove(
          board,
          toMove,
          sims,
          controller.signal
        );
        if (controller.signal.aborted || trace == null || trace.index < 0) return;
        pendingAiThinkMsRef.current = Date.now() - start;
        await paceAiTurn(controller.signal);
        if (controller.signal.aborted) return;
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
    gameAttrs.boardStr,
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
    const winnerCode =
      playerA.score > playerB.score
        ? 0
        : playerB.score > playerA.score
          ? 1
          : 2;
    const startedFromInitialBoard =
      playerA.score + playerB.score === 4 + session.moves;
    const isRemoteRecorder = !isRemote || seatRef.current === "a";
    if (startedFromInitialBoard && isRemoteRecorder) {
      submitGameLog(
        buildGameLogPayload({
          log: gameLogRef.current,
          mode: gameModeCode(playerA.type, playerB.type),
          blackScore: playerA.score,
          whiteScore: playerB.score,
          winner: winnerCode,
        })
      );
    }
  }, [
    gameOver,
    playerA.score,
    playerA.type,
    playerB.score,
    playerB.type,
    isRemote,
  ]);

  useEffect(() => {
    const gen = ++reviewGenRef.current;
    const current = () => gen === reviewGenRef.current;
    if (!showDetails || !reviewing || reviewIndex == null) {
      setReviewLine(null);
      setReviewMarks(emptyMarks);
      return;
    }
    if (reviewIndex === 0) {
      setReviewLine("opening");
      setReviewTone("pending");
      setReviewMarks(emptyMarks);
      return;
    }

    const after = winHistory[reviewIndex];
    const before = winHistory[reviewIndex - 1];
    if (!before || !after || !isPlayedStep(before, after)) {
      setReviewLine(!after || after.lastPieceStr === "-" ? "opening" : "pass");
      setReviewTone("pending");
      setReviewMarks(emptyMarks);
      return;
    }

    const played = Number(after.lastPieceStr);
    const mover = after.board[played];
    if ((mover !== 0 && mover !== 1) || !Number.isInteger(played)) {
      setReviewLine(null);
      setReviewMarks(emptyMarks);
      return;
    }

    const key = `${before.board.join("")}:${mover}:${played}`;
    const cached = reviewCacheRef.current.get(key);
    if (cached) {
      setReviewLine(cached.summary);
      setReviewTone(gradeTone(cached.grade));
      setReviewMarks(marksFromReview(cached));
      return;
    }
    if (loadingAiMove) {
      setReviewLine("review ..");
      setReviewTone("pending");
      setReviewMarks(emptyMarks);
      return;
    }

    setReviewLine("review ..");
    setReviewTone("pending");
    setReviewMarks(emptyMarks);
    const controller = new AbortController();
    let started = false;
    const timer = window.setTimeout(() => {
      started = true;
      void (async () => {
        try {
          const trace = await requestMctsTrace(
            before.board,
            mover,
            controller.signal
          );
          if (!current() || controller.signal.aborted || !trace) return;
          const visited = trace.moves.find(
            (move) => move.idx === played && move.n > 0
          );
          let playedQ = visited?.q;
          if (playedQ == null) {
            const toMove: 0 | 1 = after.turnStr === "0" ? 0 : 1;
            const value = await requestAiValue(
              after.board,
              toMove,
              controller.signal
            );
            if (!current() || controller.signal.aborted || value == null) return;
            playedQ = -value;
          }
          const review = reviewFromTrace(trace, played, playedQ);
          if (!current() || !review || controller.signal.aborted) return;
          reviewCacheRef.current.set(key, review);
          setReviewLine(review.summary);
          setReviewTone(gradeTone(review.grade));
          setReviewMarks(marksFromReview(review));
        } catch (err) {
          if (current() && !controller.signal.aborted) {
            console.warn("Move review failed", err);
            setReviewLine("review failed");
            setReviewTone("pending");
          }
        }
      })();
    }, 150);

    return () => {
      reviewGenRef.current += 1;
      controller.abort();
      window.clearTimeout(timer);
      if (started) void resetAiSearchTree();
    };
  }, [loadingAiMove, reviewIndex, reviewing, showDetails, winHistory]);

  function handleStartRemoteGame() {
    const newGameId = Math.random().toString(36).substring(2, 10);
    cancelUrlSync();
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
          aiLevel={
            playerA.type === PlayerType.AI ? aiDifficulty[0] : undefined
          }
          onAiLevelChange={(level) => handleDifficultyChange(0, level)}
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
          aiLevel={
            playerB.type === PlayerType.AI ? aiDifficulty[1] : undefined
          }
          onAiLevelChange={(level) => handleDifficultyChange(1, level)}
        />
      </div>
      <div
        className={`shrink-0 min-h-[4.75rem] sm:min-h-[5.25rem] transition-opacity duration-150 ${
          showDetails
            ? "opacity-100"
            : "opacity-0 pointer-events-none select-none"
        }`}
        aria-hidden={!showDetails}
      >
        <WinProbability
          history={winHistory.map((sample) => sample.p)}
          cursor={reviewIndex}
          onCursor={handleReviewCursor}
          reviewSummary={reviewing ? reviewLine : null}
          reviewTone={reviewTone}
          branchSquare={
            !isRemote && reviewing && pendingBranch
              ? squareFromPieceIndex(pendingBranch.pieceIndex)
              : null
          }
          onBranchYes={confirmBranch}
          onBranchNo={() => setPendingBranch(null)}
        />
      </div>
      <div className="flex-1 min-h-0 w-full min-w-0 my-1.5 sm:my-2 [container-type:size] grid place-items-center">
        <div className="crt-screen aspect-square w-[min(100cqw,100cqh)]">
          <div className="arcade-felt crt-glass w-full h-full p-1 sm:p-2 md:p-2.5 overflow-visible">
            <div className="grid grid-cols-8 grid-rows-8 gap-1 sm:gap-1.5 w-full h-full min-w-0 overflow-visible">
              {shownBoard.map((player, index) => (
                <OthelloPiece
                  key={index}
                  pieceIndex={index}
                  playerIndex={player}
                  handlePieceSelection={handlePieceSelection}
                  wasLastMove={index === Number(shownLastPiece)}
                  scrub={reviewIndex != null}
                  reviewMark={reviewing ? reviewMarks.get(index) ?? null : null}
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
        <div className="relative min-h-11 min-w-[6.5rem] flex items-center">
          {waitingForPlayer ? (
            <p className="text-left">
              {CMD.remote}
              <span className="tui-cursor" aria-hidden />
            </p>
          ) : !isRemote ? (
            <button
              type="button"
              className="text-left w-fit py-1 text-crt-phosphor underline decoration-phosphor/45 underline-offset-[3px] hover:text-crt-amber hover:decoration-amber cursor-pointer"
              onClick={handleStartRemoteGame}
            >
              {CMD.remote}
            </button>
          ) : null}
        </div>
        <button
          type="button"
          className="text-left min-h-11 py-1 text-crt-phosphor underline decoration-phosphor/45 underline-offset-[3px] hover:text-crt-amber hover:decoration-amber cursor-pointer tabular-nums"
          onClick={handleDetailsToggle}
          aria-pressed={showDetails}
        >
          <span className="inline-block min-w-[13.5ch] text-left">
            {CMD.details} {flag("details", showDetails)}
          </span>
        </button>
      </div>
    </div>
  );
}
