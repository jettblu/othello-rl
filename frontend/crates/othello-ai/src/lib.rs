use std::sync::Arc;

use burn::backend::ndarray::NdArray;
use rl_gym::env::Environment;
use rl_gym::games::othello::{Othello, OthelloAction, Player};
use rl_gym::tools::alphazero::PolicyValueAgent;
use rl_gym::tools::mcts::{MctsSolver, SearchReport};
use wasm_bindgen::prelude::*;

type Backend = NdArray<f32>;

const WEIGHTS: &[u8] = include_bytes!("../models/wide48-human.mpk");
const DEFAULT_SIMS: usize = 64;

#[wasm_bindgen]
pub struct OthelloAgent {
    inner: Arc<PolicyValueAgent<Backend>>,
    solver: MctsSolver,
}

#[wasm_bindgen]
impl OthelloAgent {
    #[wasm_bindgen(constructor)]
    pub fn new() -> Result<OthelloAgent, JsValue> {
        let agent = PolicyValueAgent::<Backend>::load_bytes(WEIGHTS, Default::default())
            .map_err(|err| JsValue::from_str(&err))?;
        let solver = MctsSolver::new(DEFAULT_SIMS, 1.4).with_play_pruning();
        Ok(Self {
            inner: Arc::new(agent),
            solver,
        })
    }

    /// Value for the side to move, in `[-1, 1]`.
    #[wasm_bindgen]
    pub fn evaluate(&self, board: &[u8], player: u8) -> f32 {
        let Some(env) = env_from_flat(board, player) else {
            return 0.0;
        };
        self.inner.predict(&env).value
    }

    /// 64 cells: 0 green, 1 amber, 2 empty. Square index, or -1.
    #[wasm_bindgen]
    pub fn guided(&self, board: &[u8], player: u8, sims: usize) -> i32 {
        self.trace(board, player, sims).0
    }

    /// MCTS snapshot JSON for the live console.
    #[wasm_bindgen]
    pub fn guided_trace(&self, board: &[u8], player: u8, sims: usize) -> String {
        self.trace(board, player, sims).1
    }
}

impl OthelloAgent {
    fn trace(&self, board: &[u8], player: u8, sims: usize) -> (i32, String) {
        let sims = sims.max(1);
        let env = match env_from_flat(board, player) {
            Some(env) => env,
            None => return (-1, empty_trace(-1, sims)),
        };
        if env.is_terminal() {
            return (-1, empty_trace(-1, sims));
        }
        let mut solver = self.solver;
        solver.num_simulations = sims;
        let report = solver.search_report(&env, Some(Arc::clone(&self.inner) as _));
        let index = report
            .leading_action()
            .map(|action| {
                let OthelloAction::Place(row, col) = *action;
                (row * 8 + col) as i32
            })
            .unwrap_or(-1);
        (index, format_trace(index, &report))
    }
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

fn algebraic(row: usize, col: usize) -> String {
    format!("{}{}", (b'a' + col as u8) as char, row + 1)
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
        "{{\"index\":{index},\"sims\":{sims},\"nodes\":0,\"root\":0,\"c\":1.4,\"moves\":[]}}"
    )
}

fn format_trace(index: i32, report: &SearchReport<OthelloAction>) -> String {
    let moves: Vec<String> = report
        .action_stats
        .iter()
        .take(6)
        .map(|stat| {
            let OthelloAction::Place(row, col) = stat.action;
            let sq = algebraic(row, col);
            let idx = row * 8 + col;
            let q = json_f32(stat.mean_value());
            let p = json_f32(stat.visit_share(report.root_visits));
            format!(
                "{{\"sq\":\"{sq}\",\"idx\":{idx},\"n\":{},\"q\":{q},\"p\":{p}}}",
                stat.visits
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
