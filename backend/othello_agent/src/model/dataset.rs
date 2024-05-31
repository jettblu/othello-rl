use burn::data::dataset::{ transform::{ Mapper, MapperDataset }, Dataset, InMemDataset };
use std::collections::HashMap;

use crate::{
    gameplay::{
        constants::CODE_CHARS,
        encoding::{ board_floats_from_string, create_code_char_hash },
    },
    simulate::history::{ ObservationMove, ObservationMoveForML },
};

/// Diabetes patients dataset, also used in [scikit-learn](https://scikit-learn.org/stable/).
/// See [Diabetes dataset](https://scikit-learn.org/stable/datasets/toy_dataset.html#diabetes-dataset).
///
/// The data is parsed from a single csv file (tab as the delimiter).
/// The dataset contains 10 baseline variables (age, sex, body mass index, average blood pressure and
/// 6 blood serum measurements for a total of 442 diabetes patients.
/// For each patient, the response of interest, a quantitative measure of disease progression one year
/// after baseline, was collected. This represents the target variable.
pub struct OthelloMovesDataset {
    dataset: MappedDataset,
}

type MappedDataset = MapperDataset<InMemDataset<ObservationMove>, ConvertSamples, ObservationMove>;

impl OthelloMovesDataset {
    pub fn new(split: &str) -> Self {
        let dataset: Option<InMemDataset<ObservationMove>>;
        match split {
            "train" => {
                dataset = OthelloMovesDataset::fetch_from_file(
                    "data/othello_moves_train_dataset.csv"
                );
            }
            "test" => {
                dataset = OthelloMovesDataset::fetch_from_file(
                    "data/othello_moves_test_dataset.csv"
                );
            }
            _ => panic!("Invalid split"),
        }
        if dataset.is_none() {
            panic!("Failed to fetch dataset");
        }

        let dataset = dataset.unwrap();

        // create converter
        let hash_map = create_code_char_hash(CODE_CHARS);
        let converter = ConvertSamples::new(hash_map);

        let dataset = MapperDataset::new(dataset, converter);

        Self {
            dataset,
        }
    }

    pub fn train() -> Self {
        Self::new("train")
    }

    pub fn test() -> Self {
        Self::new("test")
    }

    fn fetch_from_file(path: &str) -> Option<InMemDataset<ObservationMove>> {
        // Build dataset from csv with tab ('\t') delimiter
        let mut rdr = csv::ReaderBuilder::new();
        let rdr = rdr.delimiter(b',');

        let dataset = InMemDataset::from_csv(path, rdr).unwrap();
        Some(dataset)
    }
}

// Implement the `Dataset` trait which requires `get` and `len`
impl Dataset<ObservationMoveForML> for OthelloMovesDataset {
    fn get(&self, index: usize) -> Option<ObservationMoveForML> {
        self.dataset.get(index)
    }

    fn len(&self) -> usize {
        self.dataset.len()
    }
}

/// Mapper converting audio bytes into audio samples and the label to enum class.
struct ConvertSamples {
    decoder: HashMap<char, u8>,
}

impl ConvertSamples {
    fn new(decoder: HashMap<char, u8>) -> Self {
        Self { decoder }
    }
}

impl ConvertSamples {
    fn to_formatted_observation(&self, item: &ObservationMove) -> ObservationMoveForML {
        let board_converted = board_floats_from_string(item.board_string.as_str(), &self.decoder);
        ObservationMoveForML {
            board: board_converted,
            winner: item.winner,
            next_move_index: item.next_move_index,
            game_id: item.game_id,
        }
    }
}

impl Mapper<ObservationMove, ObservationMoveForML> for ConvertSamples {
    /// Convert audio bytes into samples of floats [-1.0, 1.0]
    /// and the label to enum class with the target word, other and silence classes.
    fn map(&self, item: &ObservationMove) -> ObservationMoveForML {
        self.to_formatted_observation(item)
    }
}
