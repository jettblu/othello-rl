use serde::{ Deserialize, Serialize };

use crate::gameplay::constants::CODE_CHARS;
use crate::gameplay::encoding::{ board_from_string, string_from_board };
use crate::gameplay::game::{ IBoard, IBoardForML };
use crate::gameplay::utils::augmented_score_for_player;

#[derive(Debug, Deserialize, Serialize, Clone)]
pub struct ObservationMove {
    pub board_string: String,
    pub game_id: u32,
    // 0 if player 0 wins, 1 if player 1 wins, 2 if draw
    // 0 is black, 1 is white
    pub winner: u8,
    pub next_move_index: usize,
}

impl ObservationMove {
    pub fn new(board_string: String, game_id: u32, winner: u8, next_move_index: usize) -> Self {
        ObservationMove {
            board_string,
            game_id,
            winner,
            next_move_index,
        }
    }
}

#[derive(Debug, Deserialize, Serialize, Clone)]
pub struct ObservationMoveForML {
    pub board: IBoardForML,
    pub game_id: u32,
    // 0 if player 0 wins, 1 if player 1 wins, 2 if draw
    // 0 is black, 1 is white
    pub winner: u8,
    pub next_move_index: usize,
}

pub struct GameHistory {
    // board history.. vector of encoded boards
    pub board_history: Vec<String>,
    // move history
    pub move_history: Vec<usize>,
    // total number of moves
    pub total_moves: u16,
    // scores for both players
    pub agent0_score: i8,
    pub agent1_score: i8,
    // id of game... should be autoincremented
    pub id: u32,
}

impl GameHistory {
    pub fn new() -> Self {
        GameHistory {
            board_history: Vec::new(),
            move_history: Vec::new(),
            total_moves: 0,
            agent0_score: 0,
            agent1_score: 0,
            // random id
            id: rand::random(),
        }
    }
    pub fn set_scores(&mut self, agent0_score: i8, agent1_score: i8) {
        self.agent0_score = agent0_score;
        self.agent1_score = agent1_score;
    }
    pub fn set_id(&mut self, id: u32) {
        self.id = id;
    }
    pub fn add_board(&mut self, board: IBoard, move_index: usize, set_scores: bool) {
        self.board_history.push(string_from_board(board, CODE_CHARS));
        self.move_history.push(move_index);
        self.total_moves += 1;
        if !set_scores {
            return;
        }
        // compute scores for both players
        let agent0_score = augmented_score_for_player(board, 0, 1, 1, 1);
        let agent1_score = augmented_score_for_player(board, 1, 1, 1, 1);
        self.set_scores(agent0_score, agent1_score);
    }

    pub fn get_formatted_data(&self) -> Vec<ObservationMove> {
        let mut data: Vec<ObservationMove> = Vec::new();
        for (i, board) in self.board_history.iter().enumerate() {
            // next move index is the index of the move that will be made next
            if i + 1 == (self.total_moves as usize) {
                break;
            }
            let next_move_index = self.move_history[i + 1];
            let winner = if self.agent0_score > self.agent1_score {
                0
            } else if self.agent1_score > self.agent0_score {
                1
            } else {
                2
            };
            let observation = ObservationMove {
                board_string: board.to_string(),
                winner: winner,
                next_move_index: next_move_index,
                game_id: self.id,
            };
            data.push(observation);
        }
        data
    }
}

// add method to print summary of game history
// summary will include total moves, scores, and id
impl std::fmt::Display for GameHistory {
    fn fmt(&self, f: &mut std::fmt::Formatter) -> std::fmt::Result {
        write!(
            f,
            "Game History: id: {}, total moves: {}, agent0 score: {}, agent1 score: {}",
            self.id,
            self.total_moves,
            self.agent0_score,
            self.agent1_score
        )
    }
}

pub struct GameHistoryStore {
    pub history: Vec<GameHistory>,
    pub total_games: u32,
}

impl GameHistoryStore {
    pub fn new() -> Self {
        GameHistoryStore {
            history: Vec::new(),
            total_games: 0,
        }
    }
    // print summary of all games in history
    pub fn print_summary(&self) {
        println!("Game History SUmmary");
        println!("Total games: {}", self.total_games);
        for game in self.history.iter() {
            println!("{}", game);
        }
    }
    // add game to history
    pub fn add_game(&mut self, game: GameHistory) {
        self.history.push(game);
        self.total_games += 1;
    }

    // get last game in history
    pub fn last_game(&self) -> Option<&GameHistory> {
        self.history.last()
    }

    pub fn write_history_to_file(&self, file_path: &str) {
        let mut writer = csv::Writer::from_path(file_path).unwrap();
        for game in self.history.iter() {
            let data = game.get_formatted_data();
            for observation in data.iter() {
                writer.serialize(observation).unwrap();
            }
        }
    }
}
