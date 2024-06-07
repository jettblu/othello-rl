use burn::{
    backend::{ wgpu::WgpuDevice, Wgpu },
    config::Config,
    data::dataloader::DataLoaderBuilder,
    module::Module,
    optim::{ decay::WeightDecayConfig, AdamConfig },
    record::{ CompactRecorder, FullPrecisionSettings, NamedMpkFileRecorder, Recorder },
};
use othello_agent::model::{
    batch::OthelloMoveBatcher,
    dataset::OthelloMovesDataset,
    train::OthelloMovesTrainingConfig,
};

pub fn main() {
    let device = WgpuDevice::default();
    const ARTIFACT_DIR: &str = "tmp/othello_win_again_slim_training_artifacts";
    let config = OthelloMovesTrainingConfig::load(format!("{ARTIFACT_DIR}/config.json")).expect(
        "Config should exist for the model"
    );
    println!("Config loaded successfully");
    println!("Config: {}", config);
    // Include the model file as a reference to a byte array
    let recorder = NamedMpkFileRecorder::<FullPrecisionSettings>::new();

    let model = config.model
        .init::<Wgpu>(&device)
        .load_file(format!("{ARTIFACT_DIR}/model"), &recorder, &device)
        .expect("Model should exist");
    println!("Model loaded successfully");
    // Data
    let batcher_valid = OthelloMoveBatcher::<Wgpu>::new(device.clone());
    let dataloader_test = DataLoaderBuilder::new(batcher_valid)
        .batch_size(config.batch_size)
        .shuffle(config.seed)
        .num_workers(config.num_workers)
        .build(OthelloMovesDataset::test());
    let mut iterator = dataloader_test.iter();
    let item = iterator.next().unwrap();
    let result = model.forward_classification(item);
    // let output = output.targets;
    // apply softmax
    let output = burn::tensor::activation::softmax(result.output, 1);
    println!("Output: {}", output);
    println!("Target: {}", result.targets);
}
