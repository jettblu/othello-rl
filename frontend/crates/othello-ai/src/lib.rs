use std::sync::Arc;

use burn::backend::ndarray::NdArray;
use burn::module::Module;
use burn::record::{HalfPrecisionSettings, NamedMpkBytesRecorder, Recorder};
use rl_gym::env::Environment;
use rl_gym::games::othello::{Othello, OthelloAction, Player};
use rl_gym::tools::alphazero::{PolicyValueAgent, PolicyValueConfig};
use rl_gym::tools::mcts::{DEFAULT_LEAF_BATCH, MctsSolver};
use wasm_bindgen::prelude::*;

type NetBackend = NdArray<f32>;

/// Strict-climb champion (`SHIPPED_OTHELLO` in rl-gym).
const WEIGHTS: &[u8] = include_bytes!("../models/res96b4-hc.mpk");
const EXPLORATION: f32 = 1.4;
const DEFAULT_SIMS: usize = 64;

#[wasm_bindgen]
pub struct OthelloAgent {
    inner: Arc<PolicyValueAgent<NetBackend>>,
    solver: MctsSolver,
}

#[wasm_bindgen]
impl OthelloAgent {
    #[wasm_bindgen(constructor)]
    pub fn new() -> Result<OthelloAgent, JsValue> {
        let device = Default::default();
        let agent = load_champion(&device).map_err(|err| JsValue::from_str(&err))?;
        let solver = MctsSolver::new(DEFAULT_SIMS, EXPLORATION).with_play_pruning();
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
        let dist = solver.search_distribution_batched(
            &env,
            self.inner.as_ref(),
            DEFAULT_LEAF_BATCH,
        );
        let index = dist
            .first()
            .map(|(action, _)| {
                let OthelloAction::Place(row, col) = *action;
                (row * 8 + col) as i32
            })
            .unwrap_or(-1);
        (index, format_trace(index, sims, &dist))
    }
}

fn load_champion(device: &<NetBackend as burn::prelude::Backend>::Device) -> Result<PolicyValueAgent<NetBackend>, String> {
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

fn format_trace(index: i32, sims: usize, dist: &[(OthelloAction, f32)]) -> String {
    let moves: Vec<String> = dist
        .iter()
        .take(6)
        .map(|(action, share)| {
            let OthelloAction::Place(row, col) = *action;
            let sq = algebraic(row, col);
            let idx = row * 8 + col;
            let n = (*share * sims as f32).round().max(1.0) as u32;
            let p = json_f32(*share);
            format!("{{\"sq\":\"{sq}\",\"idx\":{idx},\"n\":{n},\"q\":0.0000,\"p\":{p}}}")
        })
        .collect();
    format!(
        "{{\"index\":{index},\"sims\":{sims},\"nodes\":{sims},\"root\":{sims},\"c\":{EXPLORATION},\"moves\":[{}]}}",
        moves.join(",")
    )
}
