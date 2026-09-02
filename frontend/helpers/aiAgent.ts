import { AI_ASSET_VERSION, POSITION_CACHE_LIMIT } from "@/constants/ai";
import { IBoard } from "@/types";

export type AiCandidate = {
  sq: string;
  idx: number;
  n: number;
  q: number;
  p: number;
};

export type AiMoveTrace = {
  index: number;
  sims: number;
  nodes: number;
  root: number;
  c: number;
  ms: number;
  player: 0 | 1;
  moves: AiCandidate[];
};

type WorkerReply = {
  id: number;
  index?: number;
  value?: number;
  ms?: number;
  trace?: AiMoveTrace;
  error?: string;
};

type Pending = {
  resolve: (reply: WorkerReply) => void;
  reject: (err: Error) => void;
};

let worker: Worker | null = null;
let nextId = 1;
const inflight = new Map<number, Pending>();
const moveCache = new Map<string, AiMoveTrace>();
const valueCache = new Map<string, number>();

function getWorker() {
  if (worker) return worker;
  worker = new Worker(`/othello-ai/${AI_ASSET_VERSION}/worker.js`, {
    type: "module",
  });
  worker.onmessage = (event: MessageEvent<WorkerReply>) => {
    const pending = inflight.get(event.data.id);
    if (!pending) return;
    inflight.delete(event.data.id);
    if (event.data.error) pending.reject(new Error(event.data.error));
    else pending.resolve(event.data);
  };
  worker.onerror = (event) => {
    const err = new Error(event.message || "AI worker failed");
    for (const pending of inflight.values()) pending.reject(err);
    inflight.clear();
    worker?.terminate();
    worker = null;
  };
  return worker;
}

function cacheKey(board: IBoard, player: 0 | 1) {
  return `${board.join("")}:${player}`;
}

function remember<T>(store: Map<string, T>, key: string, value: T) {
  if (store.size >= POSITION_CACHE_LIMIT) {
    const oldest = store.keys().next().value;
    if (oldest !== undefined) store.delete(oldest);
  }
  store.set(key, value);
}

function callWorker(
  type: "guided" | "evaluate",
  board: IBoard,
  player: 0 | 1,
  signal?: AbortSignal,
  simulations?: number
): Promise<WorkerReply | null> {
  if (signal?.aborted) return Promise.resolve(null);

  const id = nextId++;
  const cells = Uint8Array.from(board);
  const aiWorker = getWorker();

  return new Promise((resolve, reject) => {
    const finish = (reply: WorkerReply | null) => {
      signal?.removeEventListener("abort", onAbort);
      resolve(reply);
    };
    const fail = (err: Error) => {
      signal?.removeEventListener("abort", onAbort);
      reject(err);
    };
    const onAbort = () => {
      inflight.delete(id);
      finish(null);
    };

    inflight.set(id, { resolve: (reply) => finish(reply), reject: fail });
    signal?.addEventListener("abort", onAbort, { once: true });
    aiWorker.postMessage(
      { id, type, board: cells, player, simulations },
      [cells.buffer]
    );
  });
}

export function preloadAiAgent() {
  if (typeof window === "undefined") return;
  getWorker();
}

export function requestAiMove(
  board: IBoard,
  player: 0 | 1,
  simulations: number,
  signal?: AbortSignal
): Promise<AiMoveTrace | null> {
  const key = `${cacheKey(board, player)}:${simulations}`;
  const cached = moveCache.get(key);
  if (cached !== undefined) return Promise.resolve(cached);

  return callWorker("guided", board, player, signal, simulations).then(
    (reply) => {
      if (!reply) return null;
      const trace = reply.trace;
      if (!trace || trace.index < 0) return null;
      const resolved = {
        ...trace,
        ms: reply.ms ?? trace.ms,
        player: trace.player ?? player,
      };
      remember(moveCache, key, resolved);
      return resolved;
    }
  );
}

export function requestAiValue(
  board: IBoard,
  player: 0 | 1,
  signal?: AbortSignal
): Promise<number | null> {
  const key = cacheKey(board, player);
  const cached = valueCache.get(key);
  if (cached !== undefined) return Promise.resolve(cached);

  return callWorker("evaluate", board, player, signal).then((reply) => {
    if (!reply) return null;
    if (reply.value == null || Number.isNaN(reply.value)) {
      throw new Error("AI evaluate returned no value");
    }
    const value = Math.min(1, Math.max(-1, reply.value));
    remember(valueCache, key, value);
    return value;
  });
}

export function sideToMoveValueToBlackWin(value: number, player: 0 | 1) {
  const pSide = (value + 1) / 2;
  const pBlack = player === 0 ? pSide : 1 - pSide;
  return Math.min(1, Math.max(0, pBlack));
}
