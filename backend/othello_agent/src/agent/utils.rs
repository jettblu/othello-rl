use serde::Deserialize;

use crate::{
    gameplay::{ game::IGame, position::IPosition },
    simulate::history::{ GameHistory, GameHistoryStore },
};

#[derive(Debug, Deserialize)]
struct RawRecord {
    eOthello_game_id: i32,
    winner: i8,
    game_moves: String,
}

pub fn fetch_data() -> Option<GameHistoryStore> {
    // read csv file using csv crate
    // csv file is located in data/othello_dataset.csv
    let mut reader = csv::Reader::from_path("data/othello_dataset.csv").unwrap();
    let mut game_history_store: GameHistoryStore = GameHistoryStore::new();
    for record in reader.deserialize() {
        let record: RawRecord = record.unwrap();
        let game_history: GameHistory = raw_record_to_game_history(record);
        game_history_store.add_game(game_history);
    }
    Some(game_history_store)
}

pub fn raw_record_to_game_history(record: RawRecord) -> GameHistory {
    let mut game = IGame::new();
    let mut game_history = GameHistory::new();
    // chunk game_moves into 2 character strings... separate original every 2 characters
    // note that game_moves is a continous string with no spaces
    for i in 0..record.game_moves.len() / 2 {
        let move_string = &record.game_moves[i * 2..(i + 1) * 2];
        let position = IPosition::position_from_string_position(move_string);
        if position.is_none() {
            panic!("Invalid position in game moves");
        }
        let position = position.unwrap();
        game.make_move_at_position(position);
        game_history.add_board(game.board, true);
    }
    game_history
}
