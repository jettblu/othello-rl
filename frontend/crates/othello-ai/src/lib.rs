use std::sync::Arc;

use burn::backend::ndarray::NdArray;
use rl_gym::env::Environment;
use rl_gym::games::othello::{Othello, OthelloAction, Player};
use rl_gym::tools::alphazero::PolicyValueAgent;
use rl_gym::tools::mcts::{MctsSolver, PositionEval};
use wasm_bindgen::prelude::*;

type Backend = NdArray<f32>;

const WEIGHTS: &[u8] = include_bytes!("../models/wide48-human.mpk");
const DEFAULT_SIMS: usize = 8;

#[wasm_bindgen]
pub struct OthelloAgent {
    eval: Arc<dyn PositionEval<Othello>>,
    solver: MctsSolver,
}

#[wasm_bindgen]
impl OthelloAgent {
    #[wasm_bindgen(constructor)]
    pub fn new() -> Result<OthelloAgent, JsValue> {
        let agent = PolicyValueAgent::<Backend>::load_bytes(WEIGHTS, Default::default())
            .map_err(|err| JsValue::from_str(&err))?;
        let solver = MctsSolver::new(DEFAULT_SIMS, 1.4)
            .with_rollout_leaves()
            .with_play_pruning();
        Ok(Self {
            eval: Arc::new(agent),
            solver,
        })
    }

    /// Guided PUCT search. `board` is 64 cells (0 black, 1 white, 2 empty).
    /// Returns a 0–63 square index, or -1 if there is no legal move.
    #[wasm_bindgen]
    pub fn guided(&self, board: &[u8], player: u8, sims: usize) -> i32 {
        let env = match env_from_flat(board, player) {
            Some(env) => env,
            None => return -1,
        };
        if env.is_terminal() {
            return -1;
        }
        let mut solver = self.solver;
        solver.num_simulations = sims.max(1);
        solver
            .search_distribution(&env, Some(Arc::clone(&self.eval)))
            .into_iter()
            .next()
            .map(|(OthelloAction::Place(row, col), _)| (row * 8 + col) as i32)
            .unwrap_or(-1)
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
