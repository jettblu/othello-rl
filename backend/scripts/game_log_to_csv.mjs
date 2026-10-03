#!/usr/bin/env node
/**
 * Convert downloaded game JSON objects to othello_agent CSV (game_moves column).
 *
 * Usage:
 *   node scripts/game_log_to_csv.mjs ./exported-json-dir > data/othello_dataset.csv
 *
 * Each file should be one stored object with { g, w, s, ... }.
 */
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";

const dir = process.argv[2];
if (!dir) {
  console.error("Usage: node scripts/game_log_to_csv.mjs <json-directory>");
  process.exit(1);
}

async function jsonFiles(path) {
  const entries = await readdir(path, { withFileTypes: true });
  const nested = await Promise.all(
    entries.map((entry) => {
      const child = join(path, entry.name);
      return entry.isDirectory()
        ? jsonFiles(child)
        : Promise.resolve(entry.name.endsWith(".json") ? [child] : []);
    })
  );
  return nested.flat();
}

const files = await jsonFiles(dir);
console.log("eOthello_game_id,winner,game_moves");
let gameId = 0;
for (const file of files) {
  const raw = await readFile(file, "utf8");
  const row = JSON.parse(raw);
  if (!row.g || row.w == null) continue;
  console.log(`${gameId++},${row.w},${JSON.stringify(String(row.g))}`);
}
