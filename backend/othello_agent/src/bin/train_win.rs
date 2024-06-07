use burn::backend::{ wgpu::WgpuDevice, Autodiff, Wgpu };
use othello_agent::model::train::run;

fn main() {
    let device = WgpuDevice::default();
    run::<Autodiff<Wgpu>>(device, "othello_win_again_slim_training_artifacts");
}
