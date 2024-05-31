use othello_agent::agent::utils::fetch_data;

pub fn main() {
    let game_history_store: Option<othello_agent::simulate::history::GameHistoryStore> =
        fetch_data();
    if game_history_store.is_none() {
        panic!("Failed to fetch data");
    }
    let game_history_store = game_history_store.unwrap();
    game_history_store.print_summary();
    game_history_store.write_history_to_file("data/othello_moves_dataset.csv")
}
