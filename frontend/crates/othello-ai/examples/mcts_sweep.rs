//! Sweep MCTS configs against the shipped browser model (native timing).
//!
//! Run: `cargo run --example mcts_sweep --release`

use std::collections::HashSet;
use std::time::Instant;

use burn::backend::ndarray::NdArray;
use burn::module::Module;
use burn::record::{HalfPrecisionSettings, NamedMpkBytesRecorder, Recorder};
use rl_gym::env::Environment;
use rl_gym::games::othello::{Othello, OthelloAction};
use rl_gym::tools::alphazero::{PolicyValueAgent, PolicyValueConfig};
use rl_gym::tools::mcts::{DEFAULT_LEAF_BATCH, MctsSolver, SearchReport, SearchTree};

type NetBackend = NdArray<f32>;

const WEIGHTS: &[u8] = include_bytes!("../models/res96b4-hc.mpk");
const EXPLORATION: f32 = 1.4;

#[derive(Clone, Copy)]
struct Profile {
    name: &'static str,
    sims: usize,
    play_pruning: bool,
    prior_topk: usize,
    rollout_cap: usize,
}

struct Metrics {
    legal: usize,
    in_report: usize,
    visited: usize,
    zero_visit_in_report: usize,
    missing_legal: usize,
    root_visits: u32,
    top_weight: f32,
    ms: f64,
}

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

fn solver_for(profile: &Profile) -> MctsSolver {
    let mut s = MctsSolver::new(profile.sims, EXPLORATION);
    if profile.play_pruning {
        s = s.with_play_pruning();
    } else {
        if profile.prior_topk > 0 {
            s = s.with_prior_topk(profile.prior_topk);
        }
        if profile.rollout_cap > 0 {
            s = s.with_rollout_cap(profile.rollout_cap);
        }
    }
    s
}

fn search_report(
    agent: &PolicyValueAgent<NetBackend>,
    env: &Othello,
    profile: &Profile,
) -> (SearchReport<OthelloAction>, f64) {
    let solver = solver_for(profile);
    let start = Instant::now();
    let report = solver.search_report_batched(env, agent, DEFAULT_LEAF_BATCH);
    (report, start.elapsed().as_secs_f64() * 1000.0)
}

fn metrics(env: &Othello, report: &SearchReport<OthelloAction>, ms: f64) -> Metrics {
    let legal = env.legal_actions();
    let legal_set: HashSet<_> = legal.iter().cloned().collect();
    let mut visited = 0usize;
    let mut zero_visit = 0usize;
    let mut top_weight = 0.0f32;
    let mut reported: HashSet<OthelloAction> = HashSet::new();

    for stat in &report.action_stats {
        reported.insert(stat.action.clone());
        if stat.visits > 0 {
            visited += 1;
            top_weight = top_weight.max(stat.visit_share(report.root_visits));
        } else {
            zero_visit += 1;
        }
    }

    let missing_legal = legal_set.difference(&reported).count();

    Metrics {
        legal: legal.len(),
        in_report: report.action_stats.len(),
        visited,
        zero_visit_in_report: zero_visit,
        missing_legal,
        root_visits: report.root_visits,
        top_weight,
        ms,
    }
}

fn print_row(profile: &Profile, pos: &str, m: &Metrics) {
    let cov = if m.legal == 0 {
        0.0
    } else {
        (m.visited as f64 / m.legal as f64) * 100.0
    };
    println!(
        "{:<22} {:<10} sims={:>3} {:>4.0}ms legal={:>2} report={:>2} visited={:>2} miss={:>2} zero={:>2} rootV={:>3} top={:>4.0}% cov={:>5.1}%",
        profile.name,
        pos,
        profile.sims,
        m.ms,
        m.legal,
        m.in_report,
        m.visited,
        m.missing_legal,
        m.zero_visit_in_report,
        m.root_visits,
        m.top_weight * 100.0,
        cov
    );
}

fn play_best_line(agent: &PolicyValueAgent<NetBackend>, from: &Othello, plies: usize) -> Othello {
    let solver = MctsSolver::new(32, EXPLORATION).with_play_pruning();
    let mut e = from.clone();
    for _ in 0..plies {
        if e.is_terminal() {
            break;
        }
        let report = solver.search_report_batched(&e, agent, DEFAULT_LEAF_BATCH);
        let Some(action) = report.leading_action() else {
            break;
        };
        e.step(action.clone());
    }
    e
}

fn pick_agreement(
    agent: &PolicyValueAgent<NetBackend>,
    env: &Othello,
    shallow: &Profile,
    reference_sims: usize,
) -> f32 {
    let (shallow_report, _) = search_report(agent, env, shallow);
    let ref_solver = MctsSolver::new(reference_sims, EXPLORATION);
    let ref_report = ref_solver.search_report_batched(env, agent, DEFAULT_LEAF_BATCH);
    let a = shallow_report.leading_action();
    let b = ref_report.leading_action();
    match (a, b) {
        (Some(x), Some(y)) if x == y => 1.0,
        _ => 0.0,
    }
}

fn tree_reuse_timing(
    agent: &PolicyValueAgent<NetBackend>,
    env: &Othello,
    sims: usize,
    plies: usize,
) -> (f64, f64, u32) {
    let profile = Profile {
        name: "reuse",
        sims,
        play_pruning: true,
        prior_topk: 0,
        rollout_cap: 0,
    };
    let solver = solver_for(&profile);
    let mut e = env.clone();
    let mut cold = 0.0;
    let mut warm = 0.0;
    let mut retained_sum = 0u32;
    let mut tree = SearchTree::new();
    let mut played: Option<OthelloAction> = None;

    for _ in 0..plies {
        if e.is_terminal() {
            break;
        }
        let t0 = Instant::now();
        let _ = solver.search_report_batched(&e, agent, DEFAULT_LEAF_BATCH);
        cold += t0.elapsed().as_secs_f64() * 1000.0;

        match &played {
            Some(action) => {
                tree.advance(action);
            }
            None => tree.reset(),
        }
        retained_sum += tree.retained_visits();

        let t1 = Instant::now();
        let _ = solver.search_distribution_with_tree(&e, agent, &mut tree, DEFAULT_LEAF_BATCH);
        warm += t1.elapsed().as_secs_f64() * 1000.0;

        let pick = solver
            .search_report_batched(&e, agent, DEFAULT_LEAF_BATCH)
            .leading_action()
            .cloned();
        if let Some(action) = pick {
            e.step(action.clone());
            played = Some(action);
        } else {
            break;
        }
    }
    let n = plies as f64;
    (cold / n, warm / n, retained_sum / plies as u32)
}

fn main() {
    let agent = load_agent();
    let open = Othello::new();
    let mid = play_best_line(&agent, &open, 28);

    let profiles = [
        Profile {
            name: "prod-easy",
            sims: 1,
            play_pruning: true,
            prior_topk: 0,
            rollout_cap: 0,
        },
        Profile {
            name: "prod-hard",
            sims: 16,
            play_pruning: true,
            prior_topk: 0,
            rollout_cap: 0,
        },
        Profile {
            name: "worker-cap",
            sims: 64,
            play_pruning: true,
            prior_topk: 0,
            rollout_cap: 0,
        },
        Profile {
            name: "hard-full-root",
            sims: 16,
            play_pruning: false,
            prior_topk: 0,
            rollout_cap: 0,
        },
        Profile {
            name: "cap-full-root",
            sims: 64,
            play_pruning: false,
            prior_topk: 0,
            rollout_cap: 0,
        },
        Profile {
            name: "prune-top16",
            sims: 32,
            play_pruning: false,
            prior_topk: 16,
            rollout_cap: 16,
        },
        Profile {
            name: "prune-top12",
            sims: 48,
            play_pruning: false,
            prior_topk: 12,
            rollout_cap: 16,
        },
        Profile {
            name: "deep-prune8",
            sims: 96,
            play_pruning: true,
            prior_topk: 0,
            rollout_cap: 0,
        },
        Profile {
            name: "ponder-budget",
            sims: 32,
            play_pruning: false,
            prior_topk: 0,
            rollout_cap: 0,
        },
    ];

    println!("Model: res96b4-hc (browser). Batched leaves, c={EXPLORATION}");
    println!("cov% = visited legal moves / all legal (UI shows only visited>0)\n");
    println!("{{profile:<22}} {{pos:<10}}     ms  legal report visited miss zero rootV top%  cov%");
    println!("{}", "-".repeat(105));

    for profile in &profiles {
        for (label, env) in [("opening", &open), ("midgame", &mid)] {
            if env.is_terminal() {
                continue;
            }
            let (report, ms) = search_report(&agent, env, profile);
            let m = metrics(env, &report, ms);
            print_row(profile, label, &m);
        }
    }

    println!("\nMove agreement vs 256-sim full-root reference (midgame):");
    for profile in [
        profiles[0], profiles[1], profiles[2], profiles[3], profiles[4], profiles[8],
    ] {
        let agree = pick_agreement(&agent, &mid, &profile, 256);
        println!("  {:<22} top-1 agree = {:.0}%", profile.name, agree * 100.0);
    }

    println!("\nTree reuse (play_pruning, sims=32, 8 plies from opening):");
    let (cold, warm, retained) = tree_reuse_timing(&agent, &open, 32, 8);
    println!(
        "  cold fresh search {:.0}ms/move  warm subtree+search {:.0}ms/move  avg retained visits {}",
        cold, warm, retained
    );

    println!("\nNote: native CPU; WASM in browser is slower but rankings similar.");
}
