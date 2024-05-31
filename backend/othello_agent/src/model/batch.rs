use burn::{ data::dataloader::batcher::Batcher, prelude::* };

use crate::simulate::history::ObservationMoveForML;

#[derive(Clone)]
pub struct OthelloMoveBatcher<B: Backend> {
    device: B::Device,
}

impl<B: Backend> OthelloMoveBatcher<B> {
    pub fn new(device: B::Device) -> Self {
        Self { device }
    }
}

#[derive(Clone, Debug)]
pub struct OthelloMoveBatch<B: Backend> {
    pub features: Tensor<B, 3, Float>,
    pub targets: Tensor<B, 1, Int>,
}

impl<B: Backend> Batcher<ObservationMoveForML, OthelloMoveBatch<B>> for OthelloMoveBatcher<B> {
    fn batch(&self, items: Vec<ObservationMoveForML>) -> OthelloMoveBatch<B> {
        let images = items
            .iter()
            .map(|item| Tensor::<B, 2, Float>::from_floats(item.board, &self.device))
            .map(|tensor| tensor.reshape([1, 8, 8]))
            .collect();

        let targets = items
            .iter()
            .map(|item|
                Tensor::<B, 1, Int>::from_data(
                    Data::from([(item.winner as i8).elem()]),
                    &self.device
                )
            )
            .collect();

        let images = Tensor::cat(images, 0).to_device(&self.device);
        let targets = Tensor::cat(targets, 0).to_device(&self.device);

        OthelloMoveBatch {
            features: images,
            targets,
        }
    }
}
