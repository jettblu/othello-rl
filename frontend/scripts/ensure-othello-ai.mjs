import { existsSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const frontendRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const dir = join(frontendRoot, "public/othello-ai");
const required = [
  ["othello_ai_bg.wasm", 100_000],
  ["othello_ai.js", 1_000],
  ["worker.js", 200],
];

let failed = false;
for (const [name, minBytes] of required) {
  const path = join(dir, name);
  if (!existsSync(path)) {
    console.error(`Missing ${path}`);
    failed = true;
    continue;
  }
  const size = statSync(path).size;
  if (size < minBytes) {
    console.error(`${path} is ${size} bytes; expected at least ${minBytes}`);
    failed = true;
  }
}

if (failed) {
  console.error(
    "The guided WASM agent is not in public/othello-ai. Run `npm run build:wasm` locally and commit those files — Vercel does not compile Rust."
  );
  process.exit(1);
}
