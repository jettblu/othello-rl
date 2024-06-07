use crate::gameplay::constants::NULL_MOVE_INDEX;
use crate::gameplay::game::{ IBoard, IPlayer };
use crate::gameplay::position::IPosition;
use rand::{ thread_rng, Rng };
use rl_examples::agents::agent::Agent;
use crate::gameplay::recommender::suggest_moves_rules_based;

// pub struct RuleAgent {
//     player: IPlayer,
// }

// impl RuleAgent {
//     pub fn new(player: IPlayer) -> Self {
//         RuleAgent {
//             player,
//         }
//     }
// }

// impl Agent for RuleAgent {
//     fn get_move(&self, board: IBoard) -> Option<IPosition> {
//         let suggested_moves = self.suggest_moves(board);
//         self.select_move(suggested_moves)
//     }
//     fn suggest_moves(&self, board: IBoard) -> Vec<IPosition> {
//         let best_moves: Vec<IPosition> = suggest_moves_rules_based(board, self.player);
//         best_moves
//     }
// }

pub struct RuleAgent {
    player: IPlayer,
    last_board: IBoard,
}

impl RuleAgent {
    pub fn new(player: IPlayer, board: IBoard) -> RuleAgent {
        RuleAgent {
            player,
            last_board: board,
        }
    }
    fn suggest_moves(&self, board: IBoard) -> Vec<IPosition> {
        let best_moves: Vec<IPosition> = suggest_moves_rules_based(board, self.player);
        best_moves
    }

    pub fn update_board(&mut self, board: IBoard) {
        self.last_board = board;
    }

    fn choose_from_actions(&mut self, suggested_moves: Vec<IPosition>) -> Option<IPosition> {
        if suggested_moves.len() == 0 {
            return None;
        }
        let mut rng = thread_rng();
        let random_index = rng.gen_range(0..suggested_moves.len());
        Some(suggested_moves[random_index].duplicate())
    }
}

impl Agent for RuleAgent {
    fn select_action(&mut self) -> usize {
        let suggested_moves = self.suggest_moves(self.last_board);
        let res = self.choose_from_actions(suggested_moves);
        if res.is_none() {
            return NULL_MOVE_INDEX;
        }
        return res.unwrap().to_piece_index();
    }

    fn take_action(&mut self, action: usize) -> f64 {
        0.0
    }

    fn update_estimate(&mut self, state: String, action: usize, reward: f64, _is_terminal: bool) {}
}
