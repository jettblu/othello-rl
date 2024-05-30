use othello_agent::simulate::environment::OthelloEnvironment;
use rl_examples::environment::Environment;

pub fn main() {
    let mut env: OthelloEnvironment = OthelloEnvironment::new();
    let end_reward: f64;
    let mut i = 0;
    loop {
        i += 1;
        println!("Step {}", i);
        // possible actions
        let possible_actions = env.get_actions();
        let action: usize;
        if possible_actions.len() == 0 {
            println!("Using dummy action as no actions available");
            action = 0;
        } else {
            action = possible_actions[0];
            println!("Action: {}", action);
        }
        let temp_reward = env.step(action);
        let is_terminal = env.is_terminal();
        if is_terminal {
            end_reward = temp_reward;
            break;
        }
    }
    println!("End reward: {}", end_reward);
}
