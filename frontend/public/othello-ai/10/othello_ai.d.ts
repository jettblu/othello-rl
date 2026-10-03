/* tslint:disable */
/* eslint-disable */

export class OthelloAgent {
    free(): void;
    [Symbol.dispose](): void;
    /**
     * Re-root after `move_index` was played from the position the tree describes.
     */
    advance_mcts_tree(move_index: number): boolean;
    evaluate(board: Uint8Array, player: number): number;
    guided(board: Uint8Array, player: number, sims: number): number;
    guided_trace(board: Uint8Array, player: number, sims: number): string;
    /**
     * `ponder`: full root expansion + retained tree; `play`: pruned fast move pick.
     */
    guided_trace_mode(board: Uint8Array, player: number, sims: number, ponder: boolean): string;
    constructor();
    reset_mcts_tree(): void;
}

export type InitInput = RequestInfo | URL | Response | BufferSource | WebAssembly.Module;

export interface InitOutput {
    readonly memory: WebAssembly.Memory;
    readonly __wbg_othelloagent_free: (a: number, b: number) => void;
    readonly othelloagent_advance_mcts_tree: (a: number, b: number) => number;
    readonly othelloagent_evaluate: (a: number, b: number, c: number, d: number) => number;
    readonly othelloagent_guided: (a: number, b: number, c: number, d: number, e: number) => number;
    readonly othelloagent_guided_trace: (a: number, b: number, c: number, d: number, e: number) => [number, number];
    readonly othelloagent_guided_trace_mode: (a: number, b: number, c: number, d: number, e: number, f: number) => [number, number];
    readonly othelloagent_new: () => [number, number, number];
    readonly othelloagent_reset_mcts_tree: (a: number) => void;
    readonly __wbindgen_exn_store: (a: number) => void;
    readonly __externref_table_alloc: () => number;
    readonly __wbindgen_externrefs: WebAssembly.Table;
    readonly __wbindgen_malloc: (a: number, b: number) => number;
    readonly __wbindgen_free: (a: number, b: number, c: number) => void;
    readonly __externref_table_dealloc: (a: number) => void;
    readonly __wbindgen_start: () => void;
}

export type SyncInitInput = BufferSource | WebAssembly.Module;

/**
 * Instantiates the given `module`, which can either be bytes or
 * a precompiled `WebAssembly.Module`.
 *
 * @param {{ module: SyncInitInput }} module - Passing `SyncInitInput` directly is deprecated.
 *
 * @returns {InitOutput}
 */
export function initSync(module: { module: SyncInitInput } | SyncInitInput): InitOutput;

/**
 * If `module_or_path` is {RequestInfo} or {URL}, makes a request and
 * for everything else, calls `WebAssembly.instantiate` directly.
 *
 * @param {{ module_or_path: InitInput | Promise<InitInput> }} module_or_path - Passing `InitInput` directly is deprecated.
 *
 * @returns {Promise<InitOutput>}
 */
export default function __wbg_init (module_or_path?: { module_or_path: InitInput | Promise<InitInput> } | InitInput | Promise<InitInput>): Promise<InitOutput>;
