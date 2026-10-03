use std::collections::HashMap;
use std::sync::Arc;

use burn::backend::ndarray::NdArray;
use burn::module::Module;
use burn::record::{HalfPrecisionSettings, NamedMpkBytesRecorder, Recorder};
use rl_gym::env::Environment;
use rl_gym::games::othello::{Othello, OthelloAction, Player};
use rl_gym::tools::alphazero::{PolicyValueAgent, PolicyValueConfig, Prediction};
use rl_gym::tools::mcts::{
    ActionStat, DEFAULT_LEAF_BATCH, MctsSolver, SearchReport, SearchTree,
};
use wasm_bindgen::prelude::*;

type NetBackend = NdArray<f32>;

/// Strict-climb champion (`SHIPPED_OTHELLO` in rl-gym).
const WEIGHTS: &[u8] = include_bytes!("../models/res96b4-hc.mpk");
const EXPLORATION: f32 = 1.4;
const PONDER_SIMS: usize = 32;

#[wasm_bindgen]
pub struct OthelloAgent {
    inner: Arc<PolicyValueAgent<NetBackend>>,
    play_solver: MctsSolver,
    ponder_solver: MctsSolver,
    tree: SearchTree<OthelloAction>,
    tree_pos_key: String,
}

#[wasm_bindgen]
impl OthelloAgent {
    #[wasm_bindgen(constructor)]
    pub fn new() -> Result<OthelloAgent, JsValue> {
        let device = Default::default();
        let agent = load_champion(&device).map_err(|err| JsValue::from_str(&err))?;
        let play_solver = MctsSolver::new(PONDER_SIMS, EXPLORATION).with_play_pruning();
        let ponder_solver = MctsSolver::new(PONDER_SIMS, EXPLORATION);
        Ok(Self {
            inner: Arc::new(agent),
            play_solver,
            ponder_solver,
            tree: SearchTree::new(),
            tree_pos_key: String::new(),
        })
    }

    #[wasm_bindgen]
    pub fn reset_mcts_tree(&mut self) {
        self.tree.reset();
        self.tree_pos_key.clear();
    }

    /// Re-root after `move_index` was played from the position the tree describes.
    #[wasm_bindgen]
    pub fn advance_mcts_tree(&mut self, move_index: i32) -> bool {
        if move_index < 0 || move_index >= 64 {
            return false;
        }
        let action = index_to_action(move_index as u8);
        let kept = self.tree.advance(&action);
        self.tree_pos_key.clear();
        kept
    }

    #[wasm_bindgen]
    pub fn evaluate(&self, board: &[u8], player: u8) -> f32 {
        let Some(env) = env_from_flat(board, player) else {
            return 0.0;
        };
        self.inner.predict(&env).value
    }

    #[wasm_bindgen]
    pub fn guided(&mut self, board: &[u8], player: u8, sims: usize) -> i32 {
        self.trace(board, player, sims, false).0
    }

    #[wasm_bindgen]
    pub fn guided_trace(&mut self, board: &[u8], player: u8, sims: usize) -> String {
        self.trace(board, player, sims, false).1
    }

    /// `ponder`: full root expansion + retained tree; `play`: pruned fast move pick.
    #[wasm_bindgen]
    pub fn guided_trace_mode(
        &mut self,
        board: &[u8],
        player: u8,
        sims: usize,
        ponder: bool,
    ) -> String {
        self.trace(board, player, sims, ponder).1
    }
}

impl OthelloAgent {
    fn trace(&mut self, board: &[u8], player: u8, sims: usize, ponder: bool) -> (i32, String) {
        let sims = sims.max(1);
        let env = match env_from_flat(board, player) {
            Some(env) => env,
            None => return (-1, empty_trace(-1, sims)),
        };
        if env.is_terminal() {
            return (-1, empty_trace(-1, sims));
        }

        self.sync_tree_position(board, player);

        let use_sims = if ponder {
            sims.max(PONDER_SIMS)
        } else {
            sims
        };
        let solver = if ponder {
            &self.ponder_solver
        } else {
            &self.play_solver
        };
        let mut solver = *solver;
        solver.num_simulations = use_sims;

        let report = solver.search_report_with_tree(
            &env,
            self.inner.as_ref(),
            &mut self.tree,
            DEFAULT_LEAF_BATCH,
        );

        let index = report
            .leading_action()
            .map(|action| action_to_index(action))
            .unwrap_or(-1);

        (
            index,
            format_trace(index, &report, &env, self.inner.as_ref()),
        )
    }

    fn sync_tree_position(&mut self, board: &[u8], player: u8) {
        let key = pos_key(board, player);
        if self.tree_pos_key.is_empty() {
            self.tree_pos_key = key;
            return;
        }
        if self.tree_pos_key != key {
            self.tree.reset();
            self.tree_pos_key = key;
        }
    }
}

fn pos_key(board: &[u8], player: u8) -> String {
    let mut key = String::with_capacity(board.len() + 1);
    for cell in board {
        key.push(char::from(b'0' + *cell));
    }
    key.push(char::from(b'0' + player));
    key
}

fn index_to_action(index: u8) -> OthelloAction {
    OthelloAction::Place(index / 8, index % 8)
}

fn action_to_index(action: &OthelloAction) -> i32 {
    let OthelloAction::Place(row, col) = *action;
    (row * 8 + col) as i32
}

fn load_champion(
    device: &<NetBackend as burn::prelude::Backend>::Device,
) -> Result<PolicyValueAgent<NetBackend>, String> {
    let config = PolicyValueConfig::new().with_filters(96).with_blocks(4);
    let recorder = NamedMpkBytesRecorder::<HalfPrecisionSettings>::default();
    let record = recorder
        .load(WEIGHTS.to_vec(), device)
        .map_err(|err| err.to_string())?;
    let model = config.init(device).load_record(record);
    Ok(PolicyValueAgent::from_model(model, config, device.clone()))
}

fn env_from_flat(board: &[u8], player: u8) -> Option<Othello> {
    if board.len() != 64 {
        return None;
    }
    let mut cells = [[Player::Empty; 8]; 8];
    for (index, cell) in board.iter().enumerate() {
        cells[index / 8][index % 8] = match cell {
            0 => Player::Black,
            1 => Player::White,
            _ => Player::Empty,
        };
    }
    let to_move = if player == 1 {
        Player::White
    } else {
        Player::Black
    };
    Some(Othello::from_board(cells, to_move))
}

fn algebraic(row: u8, col: u8) -> String {
    format!("{}{}", (b'a' + col) as char, row + 1)
}

fn json_f32(value: f32) -> String {
    if !value.is_finite() {
        "0".into()
    } else {
        format!("{value:.4}")
    }
}

fn empty_trace(index: i32, sims: usize) -> String {
    format!(
        "{{\"index\":{index},\"sims\":{sims},\"nodes\":0,\"root\":0,\"c\":{EXPLORATION},\"moves\":[]}}"
    )
}

fn policy_for_action(pred: &Prediction, action: &OthelloAction) -> f32 {
    let OthelloAction::Place(row, col) = *action;
    pred.policy
        .get(row as usize * 8 + col as usize)
        .copied()
        .unwrap_or(0.0)
}

/// Merge MCTS root stats with network policy on every legal move so the UI always has weights.
fn merged_root_stats(
    report: &SearchReport<OthelloAction>,
    env: &Othello,
    pred: &Prediction,
) -> Vec<(OthelloAction, u32, f32, f32)> {
    let legal = env.legal_actions();
    let mut by_action: HashMap<OthelloAction, ActionStat<OthelloAction>> = HashMap::new();
    for stat in &report.action_stats {
        by_action.insert(stat.action.clone(), stat.clone());
    }

    let mut policy_sum = 0.0f32;
    for action in &legal {
        policy_sum += policy_for_action(pred, action);
    }
    if policy_sum <= 0.0 {
        policy_sum = legal.len() as f32;
    }

    let mut out = Vec::with_capacity(legal.len());
    for action in legal {
        match by_action.get(&action) {
            Some(stat) if stat.visits > 0 => {
                let p = stat.visit_share(report.root_visits.max(1));
                out.push((action, stat.visits, stat.mean_value(), p));
            }
            _ => {
                let p = policy_for_action(pred, &action) / policy_sum;
                out.push((action, 0, 0.0, p));
            }
        }
    }

    out.sort_by(|a, b| {
        b.3
            .partial_cmp(&a.3)
            .unwrap_or(std::cmp::Ordering::Equal)
            .then_with(|| b.1.cmp(&a.1))
    });
    out
}

fn format_trace(
    index: i32,
    report: &SearchReport<OthelloAction>,
    env: &Othello,
    agent: &PolicyValueAgent<NetBackend>,
) -> String {
    let pred = agent.predict(env);
    let merged = merged_root_stats(report, env, &pred);

    let moves: Vec<String> = merged
        .iter()
        .map(|(action, n, q, p)| {
            let OthelloAction::Place(row, col) = *action;
            let sq = algebraic(row, col);
            let idx = row * 8 + col;
            format!(
                "{{\"sq\":\"{sq}\",\"idx\":{idx},\"n\":{n},\"q\":{},\"p\":{}}}",
                json_f32(*q),
                json_f32(*p)
            )
        })
        .collect();

    format!(
        "{{\"index\":{index},\"sims\":{},\"nodes\":{},\"root\":{},\"c\":{:.2},\"moves\":[{}]}}",
        report.completed,
        report.nodes,
        report.root_visits,
        report.exploration_constant,
        moves.join(",")
    )
}
