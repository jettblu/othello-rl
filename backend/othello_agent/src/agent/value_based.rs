use crate::gameplay::constants::NULL_MOVE_INDEX;
use crate::gameplay::game::{ board_to_ml_input, IBoard, IPlayer };
use crate::gameplay::position::IPosition;
use crate::gameplay::utils::board_by_playing_piece_at_index;
use crate::model::batch::OthelloMoveBatcher;
use crate::model::dataset::OthelloMovesDataset;
use crate::model::model::{ Model, ModelConfig };
use crate::model::train::OthelloMovesTrainingConfig;
use crate::simulate::history::ObservationMove;
use burn::config::Config;
use burn::data::dataloader::DataLoaderBuilder;
use burn::module::Module;
use burn::optim::decay::WeightDecayConfig;
use burn::optim::AdamConfig;
use burn::record::{ CompactRecorder, FullPrecisionSettings, NamedMpkFileRecorder };
use burn::tensor::backend::{ AutodiffBackend, Backend };
use burn::tensor::{ Device, Float, Tensor };
use burn::train::{
    metric::{
        store::{ Aggregate, Direction, Split },
        AccuracyMetric,
        CpuMemory,
        CpuTemperature,
        CpuUse,
        LossMetric,
    },
    LearnerBuilder,
    MetricEarlyStoppingStrategy,
    StoppingCondition,
};
use rand::{ thread_rng, Rng };
use rl_examples::agents::agent::Agent;

pub struct ValueAgent<B: Backend> {
    player: IPlayer,
    current_board: IBoard,
    possible_moves: Vec<usize>,
    model: Model<B>,
    device: Device<B>,
    current_prob_of_win: (f32, f32, f32),
}

impl<B: AutodiffBackend> ValueAgent<B> {
    pub fn new(player: IPlayer, board: IBoard, device: Device<B>) -> ValueAgent<B> {
        let model = ValueAgent::load_value_model(&device);
        ValueAgent {
            player,
            current_board: board,
            possible_moves: Vec::new(),
            model: model,
            device: device,
            current_prob_of_win: (0.0, 0.0, 0.0),
        }
    }
    pub fn get_win_probability(&self) -> f32 {
        if self.player == 0 { self.current_prob_of_win.0 } else { self.current_prob_of_win.1 }
    }

    pub fn train(
        &mut self,
        observations: Vec<ObservationMove>,
        observartions_for_validation: Vec<ObservationMove>
    ) {
        let batcher_train = OthelloMoveBatcher::<B>::new(self.device.clone());
        let batcher_valid = OthelloMoveBatcher::<B::InnerBackend>::new(self.device.clone());
        const BATCH_SIZE: usize = 8;
        const NUM_WORKERS: usize = 4;
        const SEED: u64 = 42;
        const NUM_EPOCHS: usize = 3;

        // Config
        let config_optimizer = AdamConfig::new().with_weight_decay(
            Some(WeightDecayConfig::new(5e-5))
        );
        let model_config = ModelConfig {
            num_classes: 3,
        };
        let config = OthelloMovesTrainingConfig::new(model_config, config_optimizer);
        let dataloader_train = DataLoaderBuilder::new(batcher_train)
            .batch_size(BATCH_SIZE)
            .shuffle(SEED)
            .num_workers(NUM_WORKERS)
            .build(OthelloMovesDataset::from_raw_observations(observations));
        let dataloader_test = DataLoaderBuilder::new(batcher_valid)
            .batch_size(BATCH_SIZE)
            .shuffle(SEED)
            .num_workers(NUM_WORKERS)
            .build(OthelloMovesDataset::from_raw_observations(observartions_for_validation));
        let formatted_name = "tmp/othello_win_again_slim_training_artifacts";
        // Model
        let learner = LearnerBuilder::new(&formatted_name)
            .metric_train_numeric(AccuracyMetric::new())
            .metric_valid_numeric(AccuracyMetric::new())
            .metric_train_numeric(CpuUse::new())
            .metric_valid_numeric(CpuUse::new())
            .metric_train_numeric(CpuMemory::new())
            .metric_valid_numeric(CpuMemory::new())
            .metric_train_numeric(CpuTemperature::new())
            .metric_valid_numeric(CpuTemperature::new())
            .metric_train_numeric(LossMetric::new())
            .metric_valid_numeric(LossMetric::new())
            .with_file_checkpointer(CompactRecorder::new())
            .early_stopping(
                MetricEarlyStoppingStrategy::new::<LossMetric<B>>(
                    Aggregate::Mean,
                    Direction::Lowest,
                    Split::Valid,
                    StoppingCondition::NoImprovementSince { n_epochs: 1 }
                )
            )
            .devices(vec![self.device.clone()])
            .num_epochs(NUM_EPOCHS)
            .summary()
            .build(config.model.init(&self.device.clone()), config.optimizer.init(), 1e-4);

        let model_trained = learner.fit(dataloader_train, dataloader_test);
    }
    fn suggest_moves(&mut self, board: IBoard) -> Vec<IPosition> {
        let mut suggested_moves: Vec<IPosition> = Vec::new();
        let input: Vec<Tensor<B, 3>> = self.possible_moves
            .iter()
            .map(|&index| {
                let position_formatted_raw = IPosition::position_from_piece_index(index as i8);
                let position_formatted = position_formatted_raw.unwrap();
                let new_board_raw = board_by_playing_piece_at_index(
                    board,
                    &position_formatted,
                    self.player
                );
                let new_board = new_board_raw.unwrap();
                let ml_input = board_to_ml_input(new_board);
                let tensor: Tensor<B, 2> = Tensor::<B, 2, Float>::from_floats(
                    ml_input,
                    &self.device
                );
                tensor
            })
            .map(|tensor| tensor.reshape([1, 8, 8]))
            .collect();
        let images = Tensor::cat(input, 0).to_device(&self.device);

        let output = self.model.forward(images);
        // Convert the model output into probability distribution using softmax formula
        let output = burn::tensor::activation::softmax(output, 1);
        let output = output.into_data().convert::<f32>().value;
        let mut prob_prediction: (f32, f32, f32) = (0.0, 0.0, 0.0);
        // step through output in chunks of three
        let mut best_move_index = 0;
        for i in (0..output.len()).step_by(3) {
            let (player_a, player_b, tie) = (output[i], output[i + 1], output[i + 2]);
            if self.player == 0 && player_a > prob_prediction.0 {
                prob_prediction = (player_a, player_b, tie);
                best_move_index = i / 3;
            } else if self.player == 1 && player_b > prob_prediction.1 {
                prob_prediction = (player_a, player_b, tie);
                best_move_index = i / 3;
            }
        }
        let recommended_move = IPosition::position_from_piece_index(
            self.possible_moves[best_move_index] as i8
        );
        // println!("Max score index: {}", best_move_index);
        if recommended_move.is_none() {
            panic!("Expected valid index when converting from possible moves to position");
        }
        let recommended_move = recommended_move.unwrap();
        // assuming that the model output is a probability distribution
        // annd that suggested move is actually taken
        self.current_prob_of_win = prob_prediction;
        suggested_moves.push(recommended_move);
        suggested_moves
    }

    pub fn update_board(&mut self, board: IBoard) {
        self.current_board = board;
    }

    pub fn update_player(&mut self, player: IPlayer) {
        self.player = player;
    }

    pub fn get_player(&self) -> IPlayer {
        self.player
    }

    pub fn update_possible_move_indices(&mut self, new_possible_moves: Vec<usize>) {
        self.possible_moves = new_possible_moves;
    }

    fn choose_from_actions(&mut self, suggested_moves: Vec<IPosition>) -> Option<IPosition> {
        if suggested_moves.len() == 0 {
            return None;
        }
        let mut rng = thread_rng();
        let random_index = rng.gen_range(0..suggested_moves.len());
        Some(suggested_moves[random_index].duplicate())
    }

    fn load_value_model(device: &Device<B>) -> Model<B> {
        const ARTIFACT_DIR: &str = "tmp/othello_win_again_slim_training_artifacts";
        let config = OthelloMovesTrainingConfig::load(format!("{ARTIFACT_DIR}/config.json")).expect(
            "Config should exist for the model"
        );
        println!("Config loaded successfully");
        // Include the model file as a reference to a byte array
        let recorder = NamedMpkFileRecorder::<FullPrecisionSettings>::new();

        let model = config.model
            .init::<B>(&device)
            .load_file(format!("{ARTIFACT_DIR}/model"), &recorder, &device)
            .expect("Model should exist");
        println!("Model loaded successfully");
        model
    }
}

impl<B: AutodiffBackend> Agent for ValueAgent<B> {
    fn select_action(&mut self) -> usize {
        let suggested_moves = self.suggest_moves(self.current_board);
        let res = self.choose_from_actions(suggested_moves);
        if res.is_none() {
            return NULL_MOVE_INDEX;
        }
        return res.unwrap().to_piece_index();
    }

    fn take_action(&mut self, action: usize) -> f64 {
        0.0
    }

    fn update_estimate(&mut self, state: String, action: usize, reward: f64, _is_terminal: bool) {}
}
