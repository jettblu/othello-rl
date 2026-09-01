import { cpSync, mkdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const frontendRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const versionFile = readFileSync(
  join(frontendRoot, "helpers/aiAssetVersion.ts"),
  "utf8"
);
const version = versionFile.match(/AI_ASSET_VERSION = "([^"]+)"/)?.[1];
if (!version) {
  throw new Error("AI_ASSET_VERSION not found in helpers/aiAssetVersion.ts");
}

const pkg = join(frontendRoot, "crates/othello-ai/pkg");
const dest = join(frontendRoot, "public/othello-ai", version);
mkdirSync(dest, { recursive: true });

for (const name of ["othello_ai.js", "othello_ai_bg.wasm", "othello_ai.d.ts"]) {
  cpSync(join(pkg, name), join(dest, name));
}
cpSync(join(frontendRoot, "crates/othello-ai/worker.js"), join(dest, "worker.js"));

console.log(`Published othello-ai assets to public/othello-ai/${version}/`);
