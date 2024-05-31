use othello_agent::simulate::utils::split_csv_dataset;

pub fn main() {
    let path = "data/othello_moves_dataset.csv";
    // get train ratio from command line argument
    let args = std::env::args().collect::<Vec<String>>();
    let train_ratio = args[1].parse::<f64>().unwrap();
    let train_path = "data/othello_moves_train_dataset.csv";
    let test_path = "data/othello_moves_test_dataset.csv";
    let res = split_csv_dataset(path, train_path, test_path, train_ratio);
    if res.is_err() {
        panic!("Failed to split dataset");
    }
    println!("Successfully split dataset");
}
