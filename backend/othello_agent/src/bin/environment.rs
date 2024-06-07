use othello_agent::simulate::environment::OthelloEnvironment;
use rl_examples::environment::Environment;

pub fn main() {
    let mut env: OthelloEnvironment = OthelloEnvironment::new();
    let mut end_reward: f64 = 0.0;
    let mut i = 0;
    loop {
        i += 1;
        println!("Step {}", i);
        // possible actions
        let is_terminal = env.is_terminal();
        if is_terminal {
            break;
        }
        let possible_actions = env.get_actions();
        let action: usize;
        if possible_actions.len() == 0 {
            panic!("No available actions");
        } else {
            action = possible_actions[0];
            println!("Action: {}", action);
        }
        end_reward = env.step(action);
    }
    println!("End reward: {}", end_reward);
}
