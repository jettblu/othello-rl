use rand::{ thread_rng, Rng };

use crate::gameplay::{ game::IBoard, position::IPosition };

pub trait Agent {
    fn suggest_moves(&self, board: IBoard) -> Vec<IPosition>;
    fn select_move(&self, suggested_moves: Vec<IPosition>) -> Option<IPosition> {
        if suggested_moves.len() == 0 {
            return None;
        }
        let mut rng = thread_rng();
        let random_index = rng.gen_range(0..suggested_moves.len());
        Some(suggested_moves[random_index].duplicate())
    }

    fn get_move(&self, board: IBoard) -> Option<IPosition> {
        let suggested_moves = self.suggest_moves(board);
        self.select_move(suggested_moves)
    }
}
