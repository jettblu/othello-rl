use othello_agent::simulate::history::ObservationMove;

pub fn main() {
    const DATA_PATH: &str = "data/othello_moves_train_dataset.csv";
    // read csv file using csv crate
    // csv file is located in data/othello_dataset.csv
    let mut reader = csv::Reader::from_path(DATA_PATH).unwrap();
    let mut i = 0;
    let mut moves_with_0_outcome = 0;
    let mut moves_with_1_outcome = 0;
    let mut moves_with_2_outcome = 0;
    for record in reader.deserialize() {
        i += 1;
        // print record number evry 10000 records
        if i % 10000 == 0 {
            println!("Record {}", i);
        }
        let record: ObservationMove = record.unwrap();
        match record.winner {
            0 => {
                moves_with_0_outcome += 1;
            }
            1 => {
                moves_with_1_outcome += 1;
            }
            2 => {
                moves_with_2_outcome += 1;
            }
            _ => panic!("Invalid winner"),
        }
    }
    println!("Total moves: {}", i);
    println!("Total moves with outcome 0: {}", moves_with_0_outcome);
    println!("Total moves with outcome 1: {}", moves_with_1_outcome);
    println!("Total moves with outcome 2: {}", moves_with_2_outcome);
    //print percentage of moves with outcome 0
    let total_moves = moves_with_0_outcome + moves_with_1_outcome + moves_with_2_outcome;
    let percentage_0 = ((moves_with_0_outcome as f32) / (total_moves as f32)) * 100.0;
    println!("Percentage of moves with outcome 0: {}", percentage_0);
    //print percentage of moves with outcome 1
    let percentage_1 = ((moves_with_1_outcome as f32) / (total_moves as f32)) * 100.0;
    println!("Percentage of moves with outcome 1: {}", percentage_1);
    //print percentage of moves with outcome 2
    let percentage_2 = ((moves_with_2_outcome as f32) / (total_moves as f32)) * 100.0;
    println!("Percentage of moves with outcome 2: {}", percentage_2);
}
