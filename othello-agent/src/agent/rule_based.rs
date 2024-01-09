use crate::gameplay::{
    types::{ IPlayer, IBoard, IPosition },
    recommender::suggest_moves_rules_based,
};
use crate::agent::traits::Agent;

use rand::{ thread_rng, Rng };
pub struct RuleAgent {
    player: IPlayer,
}

impl RuleAgent {
    pub fn new(player: IPlayer) -> Self {
        RuleAgent {
            player,
        }
    }
}

impl Agent for RuleAgent {
    fn get_move(&self, board: IBoard) -> Option<IPosition> {
        let suggested_moves = self.suggest_moves(board);
        self.select_move(suggested_moves)
    }
    fn suggest_moves(&self, board: IBoard) -> Vec<IPosition> {
        let mut best_moves: Vec<IPosition> = suggest_moves_rules_based(board, self.player);
        best_moves
    }
}
