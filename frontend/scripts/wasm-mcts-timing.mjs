/**
 * WASM timing for guided_trace (run from frontend/: node scripts/wasm-mcts-timing.mjs)
 */
import { Worker } from "worker_threads";
import { fileURLToPath } from "url";
import path from "path";

const dir = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "../public/othello-ai/9"
);

const initialBoard = [
  2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2,
  2, 2, 2, 1, 0, 2, 2, 2, 2, 2, 2, 0, 1, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2,
  2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2,
];

function summarize(trace) {
  const moves = trace.moves ?? [];
  const visited = moves.filter((m) => m.n > 0).length;
  return { visited, inReport: moves.length, root: trace.root };
}

async function runWorker(sims) {
  return new Promise((resolve, reject) => {
    const worker = new Worker(path.join(dir, "worker.js"));
    const id = 1;
    worker.onmessage = (ev) => {
      worker.terminate();
      if (ev.data.error) reject(new Error(ev.data.error));
      else resolve(ev.data);
    };
    worker.onerror = reject;
    worker.postMessage({
      id,
      type: "guided",
      board: Uint8Array.from(initialBoard),
      player: 0,
      simulations: sims,
    });
  });
}

for (const sims of [1, 16, 32, 64]) {
  const reply = await runWorker(sims);
  const s = summarize(reply.trace);
  console.log(
    `sims=${sims} ms=${reply.ms} root=${s.root} report=${s.inReport} visited=${s.visited}`
  );
}
