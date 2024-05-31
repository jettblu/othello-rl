use rl_examples::environment::Environment;

use crate::{
    gameplay::{ game::IGame, position::IPosition },
    simulate::history::{ GameHistory, GameHistoryStore },
};

enum OthelloPlayerType {
    Human,
    RL,
    Rules,
}

struct OthelloPlayer {
    id: String,
    turn_id: i8,
    score: i16,
    player_type: OthelloPlayerType,
    has_move: bool,
}

impl OthelloPlayer {
    pub fn new(id: String, turn_id: i8, player_type: OthelloPlayerType) -> Self {
        OthelloPlayer {
            id,
            turn_id,
            score: 0,
            player_type,
            has_move: true,
        }
    }

    pub fn set_turn_id(&mut self, turn_id: i8) {
        self.turn_id = turn_id;
    }
}

pub struct OthelloEnvironment {
    player_a: OthelloPlayer,
    player_b: OthelloPlayer,
    player_a_starts: bool,
    game: IGame,
    history_store: GameHistoryStore,
    current_game_history: GameHistory,
}

impl OthelloEnvironment {
    pub fn new() -> Self {
        let mut new_env = OthelloEnvironment {
            player_a: OthelloPlayer::new("Player A".to_string(), 0, OthelloPlayerType::RL),
            player_b: OthelloPlayer::new("Player B".to_string(), 1, OthelloPlayerType::Rules),
            player_a_starts: true,
            game: IGame::new(),
            history_store: GameHistoryStore::new(),
            current_game_history: GameHistory::new(),
        };
        if new_env.player_a_starts {
            new_env.player_a.set_turn_id(0);
        } else {
            new_env.player_b.set_turn_id(0);
        }
        new_env
    }
    pub fn get_game_history(self) -> GameHistory {
        self.current_game_history
    }
}

impl Environment for OthelloEnvironment {
    fn reset(&mut self) {
        self.game = IGame::new();
        self.player_a.has_move = false;
        self.player_b.has_move = false;
        // make random player start
        self.player_a_starts = rand::random();
        if self.player_a_starts {
            self.player_a.set_turn_id(1);
        } else {
            self.player_b.set_turn_id(1);
        }
    }

    fn get_state(&self) -> String {
        self.game.get_board_string()
    }

    ///
    /// Step function for the environment. Plays a move for the current player and returns the reward.
    ///
    /// Should check whether or not a player has a move by calling get_actions() and checking if the list is empty BEFORE calling this function.
    ///
    /// # Arguments
    ///
    /// * `action` - The action to take
    ///
    /// # Panics
    ///
    /// Panics if the action is invalid or the game is over.
    ///
    ///
    /// # Returns
    ///
    /// * `f64` - The reward for the action
    ///
    fn step(&mut self, action: usize) -> f64 {
        if !self.player_a.has_move && !self.player_b.has_move {
            panic!("Game is over. No player has move");
        }
        // toggle turn if current player has no move
        if self.game.turn == 0 && !self.player_a.has_move {
            self.game.toggle_turn();
        }
        if self.game.turn == 1 && !self.player_b.has_move {
            self.game.toggle_turn();
        }
        let position = IPosition::position_from_piece_index(action as i8);
        if position.is_none() {
            panic!(
                "Invalid action. Ensure index is valid (between 0 and 63 for standard board size)"
            );
        }
        let position = position.unwrap();
        self.game.make_move_at_position(&position);
        let move_index = position.to_piece_index();
        self.current_game_history.add_board(self.game.board, move_index, false);
        // check if either player has move
        self.player_a.has_move = self.game.player_has_move(self.player_a.turn_id as u8);
        self.player_b.has_move = self.game.player_has_move(self.player_b.turn_id as u8);
        // game is over if no player has move
        if !self.player_a.has_move && !self.player_b.has_move {
            // check scores for each player
            let agenta_score = self.game.score_for_player(0);
            let agentb_score = self.game.score_for_player(1);
            // set scores in game history
            self.current_game_history.set_scores(agenta_score, agentb_score);
            // return reward based on scores
            if agenta_score > agentb_score {
                // player a wins
                return 1.0;
            } else if agenta_score < agentb_score {
                // player a loses
                return -1.0;
            } else {
                // tie
                return 0.0;
            }
        } else {
            // game continues if at least one player has move
            0.0
        }
    }

    fn is_terminal(&self) -> bool {
        self.player_a.has_move == false && self.player_b.has_move == false
    }

    fn get_number_of_possible_actions(&self) -> usize {
        self.get_actions().len()
    }

    fn all_possible_states(&self) -> Vec<String> {
        panic!("Not implemented. Too many possible states")
    }

    fn get_number_of_possible_states(&self) -> usize {
        panic!("Not implemented. Too many possible states. Upper bound is 3^64")
    }

    fn get_total_number_of_actions_taken(&self) -> usize {
        self.current_game_history.total_moves as usize
    }

    fn get_actions(&self) -> Vec<usize> {
        // return list of possible actions for the current player
        let moves = self.game.get_valid_moves(self.game.turn);
        // convert moves to action indices
        let mut actions: Vec<usize> = Vec::new();
        for move_position in moves {
            let index = move_position.to_piece_index();
            actions.push(index);
        }
        actions
    }
}
