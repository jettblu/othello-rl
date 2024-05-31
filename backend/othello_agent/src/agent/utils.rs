use rl_examples::environment::Environment;
use serde::Deserialize;

use crate::{
    gameplay::{ game::IGame, position::IPosition },
    simulate::{ environment::OthelloEnvironment, history::{ GameHistory, GameHistoryStore } },
};

#[derive(Debug, Deserialize)]
pub struct RawRecord {
    // ignore snake case warning and never read warning
    #[allow(non_snake_case, unused)]
    eOthello_game_id: i32,
    #[allow(non_snake_case, unused)]
    winner: i8,
    game_moves: String,
}

pub fn fetch_data() -> Option<GameHistoryStore> {
    // read csv file using csv crate
    // csv file is located in data/othello_dataset.csv
    let mut reader = csv::Reader::from_path("data/othello_dataset.csv").unwrap();
    let mut game_history_store: GameHistoryStore = GameHistoryStore::new();
    let mut i = 0;
    for record in reader.deserialize() {
        i += 1;
        println!("Record {}", i);
        let record: RawRecord = record.unwrap();
        let game_history: GameHistory = raw_record_to_game_history(record);
        game_history_store.add_game(game_history);
    }
    Some(game_history_store)
}

pub fn raw_record_to_game_history(record: RawRecord) -> GameHistory {
    // chunk game_moves into 2 character strings... separate original every 2 characters
    // note that game_moves is a continous string with no spaces
    let mut env = OthelloEnvironment::new();
    for i in 0..record.game_moves.len() / 2 {
        let move_string = &record.game_moves[i * 2..(i + 1) * 2];
        let position = IPosition::position_from_string_position(move_string);
        if position.is_none() {
            panic!("Unable to convert string to position.");
        }
        let position = position.unwrap();
        env.step(position.to_piece_index());
    }
    env.get_game_history()
}
