import init, { OthelloAgent } from "./othello_ai.js";

const WASM_URL = new URL("./othello_ai_bg.wasm", import.meta.url);
const MAX_SIMULATIONS = 64;

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
  const { id, type, board, player, simulations } = event.data;
  try {
    const agent = await loadAgent();
    const cells = board instanceof Uint8Array ? board : new Uint8Array(board);
    if (type === "evaluate") {
      self.postMessage({ id, value: agent.evaluate(cells, player) });
      return;
    }
    const started = performance.now();
    const simulationCount = Math.max(
      1,
      Math.min(MAX_SIMULATIONS, Number(simulations) || MAX_SIMULATIONS)
    );
    const raw = agent.guided_trace(cells, player, simulationCount);
    const ms = Math.round(performance.now() - started);
    const trace = JSON.parse(raw);
    self.postMessage({
      id,
      index: trace.index,
      ms,
      trace: { ...trace, ms, player },
    });
  } catch (err) {
    self.postMessage({ id, error: String(err) });
  }
};
