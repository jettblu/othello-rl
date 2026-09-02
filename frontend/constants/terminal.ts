export const SIDES = ["grn", "amb"] as const;

export function sideName(player: 0 | 1) {
  return SIDES[player];
}

export function sh(argv: string) {
  return `$ ${argv}`;
}

export function bin(name: string) {
  return `./${name}`;
}

export function flag(name: string, on: boolean) {
  return on ? `--${name}` : `--no-${name}`;
}

export function othelloCmd(remote: boolean) {
  return sh(`othello ${remote ? "@ remote" : " @ local"}`);
}

export const CMD = {
  reset: bin("reset"),
  remote: bin("remote"),
  level: bin("level"),
  skip: bin("skip"),
  mcts: sh("mcts"),
} as const;

export function mctsCmd(input: {
  side: string;
  sims: number;
  nodes: number;
  root: number;
  c: number;
  ms: number;
}) {
  return sh(
    `mcts --side=${input.side} --sims=${input.sims} --nodes=${input.nodes} --root=${input.root} -c${input.c.toFixed(2)} ${input.ms}ms`
  );
}

export function playCmd(square: string | null) {
  return square ? `play ${square}` : "mcts: no move";
}

export function pWinLine(pctA: number | null, pctB: number | null) {
  return pctA == null || pctB == null ? "p_win=.." : `p_win=${pctA}/${pctB}`;
}

export const MSG = {
  copiedUrl: "copied url",
  copyFailed: "copy failed",
  seatB: "seat: b",
  peerJoined: "peer joined",
  peerLeft: "peer: disconnected",
  remoteClosed: "remote: disconnected",
  mctsFailed: "mcts: failed",
  noRootMoves: "mcts: no root moves",
} as const;
