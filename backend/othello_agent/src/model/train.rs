use burn::{
    data::dataloader::DataLoaderBuilder,
    optim::{ decay::WeightDecayConfig, AdamConfig },
    prelude::*,
    record::{ CompactRecorder, FullPrecisionSettings, NamedMpkFileRecorder, NoStdTrainingRecorder },
    tensor::backend::AutodiffBackend,
    train::{
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
    },
};

use super::{
    batch::OthelloMoveBatcher,
    dataset::OthelloMovesDataset,
    model::{ Model, ModelConfig },
};

static ARTIFACT_DIR: &str = "tmp";

#[derive(Config)]
pub struct OthelloMovesTrainingConfig {
    pub model: ModelConfig,
    #[config(default = 1)]
    pub num_epochs: usize,

    #[config(default = 128)]
    pub batch_size: usize,

    #[config(default = 4)]
    pub num_workers: usize,

    #[config(default = 42)]
    pub seed: u64,

    pub optimizer: AdamConfig,
}

fn create_artifact_dir(artifact_dir: &str) {
    // Remove existing artifacts before to get an accurate learner summary
    std::fs::remove_dir_all(artifact_dir).ok();
    std::fs::create_dir_all(artifact_dir).ok();
}

pub fn run<B: AutodiffBackend>(device: B::Device, experiment_name: &str) {
    let formatted_name = format!("{}/{}", ARTIFACT_DIR, experiment_name);
    create_artifact_dir(&formatted_name);
    // Config
    let config_optimizer = AdamConfig::new().with_weight_decay(Some(WeightDecayConfig::new(5e-5)));
    let model_config = ModelConfig {
        num_classes: 3,
    };
    let config = OthelloMovesTrainingConfig::new(model_config, config_optimizer);
    B::seed(config.seed);

    // Data
    let batcher_train = OthelloMoveBatcher::<B>::new(device.clone());
    let batcher_valid = OthelloMoveBatcher::<B::InnerBackend>::new(device.clone());

    let dataloader_train = DataLoaderBuilder::new(batcher_train)
        .batch_size(config.batch_size)
        .shuffle(config.seed)
        .num_workers(config.num_workers)
        .build(OthelloMovesDataset::train());
    let dataloader_test = DataLoaderBuilder::new(batcher_valid)
        .batch_size(config.batch_size)
        .shuffle(config.seed)
        .num_workers(config.num_workers)
        .build(OthelloMovesDataset::test());

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
        .devices(vec![device.clone()])
        .num_epochs(config.num_epochs)
        .summary()
        .build(config.model.init(&device), config.optimizer.init(), 1e-4);

    let model_trained = learner.fit(dataloader_train, dataloader_test);

    config.save(format!("{formatted_name}/config.json").as_str()).unwrap();
    // Include the model file as a reference to a byte array
    let recorder = NamedMpkFileRecorder::<FullPrecisionSettings>::new();
    model_trained
        .save_file(format!("{formatted_name}/model"), &recorder)
        .expect("Failed to save trained model");
}
