//! Coverage check for raw MCTS report sizes (WASM JSON adds policy on all legal moves).
//! Run: `cargo run --example trace_coverage --release`

use burn::backend::ndarray::NdArray;
use burn::module::Module;
use burn::record::{HalfPrecisionSettings, NamedMpkBytesRecorder, Recorder};
use rl_gym::env::Environment;
use rl_gym::games::othello::Othello;
use rl_gym::tools::alphazero::{PolicyValueAgent, PolicyValueConfig};
use rl_gym::tools::mcts::{DEFAULT_LEAF_BATCH, MctsSolver, SearchTree};

type NetBackend = NdArray<f32>;
const WEIGHTS: &[u8] = include_bytes!("../models/res96b4-hc.mpk");

fn load_agent() -> PolicyValueAgent<NetBackend> {
    let device = Default::default();
    let config = PolicyValueConfig::new().with_filters(96).with_blocks(4);
    let recorder = NamedMpkBytesRecorder::<HalfPrecisionSettings>::default();
    let record = recorder
        .load(WEIGHTS.to_vec(), &device)
        .expect("load weights");
    let model = config.init(&device).load_record(record);
    PolicyValueAgent::from_model(model, config, device)
}

fn main() {
    let agent = load_agent();
    let env = Othello::new();
    let legal = env.legal_actions().len();
    let mut tree = SearchTree::new();

    for (label, sims, prune) in [("easy-play", 8, true), ("ponder", 32, false)] {
        tree.reset();
        let mut solver = MctsSolver::new(sims, 1.4);
        if prune {
            solver = solver.with_play_pruning();
        }
        let report = solver.search_report_with_tree(&env, &agent, &mut tree, DEFAULT_LEAF_BATCH);
        let visited = report.action_stats.iter().filter(|s| s.visits > 0).count();
        println!(
            "{label}: legal={legal} report={} visited={visited} root={}",
            report.action_stats.len(),
            report.root_visits
        );
    }
    println!("WASM trace merges network policy onto every legal move for display.");
}
