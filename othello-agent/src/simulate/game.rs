use crate::{
    agent::rule_based::RuleAgent,
    agent::traits::Agent,
    gameplay::{ constants::INITIAL_BOARD, types::IBoard, utils::board_by_playing_piece_at_index },
};

use super::history::{ GameHistoryStore, GameHistory };

pub struct OthelloSimulator {
    agent0: RuleAgent,
    agent1: RuleAgent,
    board: IBoard,
    history_store: GameHistoryStore,
}

impl OthelloSimulator {
    pub fn new() -> Self {
        OthelloSimulator {
            agent0: RuleAgent::new(0),
            agent1: RuleAgent::new(1),
            board: INITIAL_BOARD,
            history_store: GameHistoryStore::new(),
        }
    }
    pub fn play_game(&mut self) {
        let mut current_player = 0;
        let mut current_board: IBoard = self.board;
        let mut num_skips: u8 = 0;
        let mut game_history = GameHistory::new();
        loop {
            println!("Player {}'s turn", current_player);
            // game is over if both players skip
            if num_skips == 2 {
                // add board to history
                game_history.add_board(current_board, true);
                break;
            } else {
                // add board to his
                game_history.add_board(current_board, false);
            }
            // get agent based on current player
            let agent = if current_player == 0 { &self.agent0 } else { &self.agent1 };
            // get move from agent
            let move_position = agent.get_move(current_board);
            // if no move, skip turn
            if move_position.is_none() {
                println!("Player {} has no move", current_player);
                current_player = 1 - current_player;
                num_skips += 1;
                continue;
            }
            // try to play move... should work as valid moves have already been filtered
            let new_board: Option<IBoard> = board_by_playing_piece_at_index(
                current_board,
                move_position.unwrap(),
                current_player
            );
            if new_board.is_none() {
                panic!("Invalid move suggested by agent");
            }
            // update board and player
            current_board = new_board.unwrap();
            current_player = 1 - current_player;
            num_skips = 0;
        }
        // add game history to store
        self.history_store.add_game(game_history);
    }

    pub fn play_games(&mut self, num_games: u32) {
        for _ in 0..num_games {
            self.play_game();
        }
    }

    pub fn print_summary(&self) {
        self.history_store.print_summary();
    }
}

#[cfg(test)]
mod tests {
    use crate::{
        simulate::{ game::OthelloSimulator, history::GameHistory },
        gameplay::constants::DEFAULT_BOARD_WIDTH,
    };

    #[test]
    fn test_play_game() {
        let mut simulator = OthelloSimulator::new();
        simulator.play_game();
        // won't see print summary unless test fails
        simulator.print_summary();
        assert_eq!(simulator.history_store.total_games, 1);
        // get last game and ensure it exists
        let last_game: Option<&GameHistory> = simulator.history_store.last_game();
        assert_eq!(last_game.is_some(), true);
        // ensure more moves than zero
        assert_eq!(last_game.unwrap().total_moves > 0, true);
        // ensure at least one player scored
        assert_eq!(
            last_game.unwrap().agent0_score > 0 || last_game.unwrap().agent1_score > 0,
            true
        );
        // ensure scores add up to DEFAULT_BOARD_WIDTH * DEFAULT_BOARD_HEIGHT
        assert_eq!(
            last_game.unwrap().agent0_score + last_game.unwrap().agent1_score,
            (DEFAULT_BOARD_WIDTH as i16) * (DEFAULT_BOARD_WIDTH as i16)
        );
    }
}
