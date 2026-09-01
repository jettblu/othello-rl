import init, { OthelloAgent } from "./othello_ai.js";

const WASM_URL = new URL("./othello_ai_bg.wasm", import.meta.url);
const SIMS = 8;

/** @type {Promise<OthelloAgent> | null} */
let agentPromise = null;

function loadAgent() {
  if (!agentPromise) {
    agentPromise = (async () => {
      await init({ module_or_path: WASM_URL });
      return new OthelloAgent();
    })();
  }
  return agentPromise;
}

loadAgent();

self.onmessage = async (event) => {
  const { id, type, board, player } = event.data;
  try {
    const agent = await loadAgent();
    const cells = board instanceof Uint8Array ? board : new Uint8Array(board);
    if (type === "evaluate") {
      self.postMessage({ id, value: agent.evaluate(cells, player) });
      return;
    }
    self.postMessage({ id, index: agent.guided(cells, player, SIMS) });
  } catch (err) {
    self.postMessage({ id, error: String(err) });
  }
};
