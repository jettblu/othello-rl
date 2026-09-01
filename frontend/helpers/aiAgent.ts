import { IBoard } from "@/types";

const POSITION_CACHE_LIMIT = 64;

type WorkerReply = {
  id: number;
  index?: number;
  error?: string;
};

let worker: Worker | null = null;
let nextId = 1;
const inflight = new Map<
  number,
  { resolve: (index: number | null) => void; reject: (err: Error) => void }
>();
const positionCache = new Map<string, number | null>();

function getWorker() {
  if (worker) return worker;
  worker = new Worker("/othello-ai/worker.js", { type: "module" });
  worker.onmessage = (event: MessageEvent<WorkerReply>) => {
    const pending = inflight.get(event.data.id);
    if (!pending) return;
    inflight.delete(event.data.id);
    if (event.data.error) {
      pending.reject(new Error(event.data.error));
      return;
    }
    const index = event.data.index;
    pending.resolve(index != null && index >= 0 ? index : null);
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

function remember(key: string, index: number | null) {
  if (positionCache.size >= POSITION_CACHE_LIMIT) {
    const oldest = positionCache.keys().next().value;
    if (oldest !== undefined) positionCache.delete(oldest);
  }
  positionCache.set(key, index);
}

export function preloadAiAgent() {
  if (typeof window === "undefined") return;
  getWorker();
}

export function requestAiMove(
  board: IBoard,
  player: 0 | 1,
  signal?: AbortSignal
): Promise<number | null> {
  const key = cacheKey(board, player);
  const cached = positionCache.get(key);
  if (cached !== undefined) return Promise.resolve(cached);
  if (signal?.aborted) return Promise.resolve(null);

  const id = nextId++;
  const cells = Uint8Array.from(board);
  const aiWorker = getWorker();

  return new Promise((resolve, reject) => {
    const finish = (index: number | null) => {
      signal?.removeEventListener("abort", onAbort);
      resolve(index);
    };
    const fail = (err: Error) => {
      signal?.removeEventListener("abort", onAbort);
      reject(err);
    };
    const onAbort = () => {
      inflight.delete(id);
      finish(null);
    };

    inflight.set(id, {
      resolve: (index) => {
        remember(key, index);
        finish(index);
      },
      reject: fail,
    });
    signal?.addEventListener("abort", onAbort, { once: true });
    aiWorker.postMessage({ id, board: cells, player }, [cells.buffer]);
  });
}
