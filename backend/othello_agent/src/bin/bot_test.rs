use burn::backend::{ wgpu::WgpuDevice, Wgpu };
use othello_agent::{
    agent::{ rule_based::RuleAgent, value_based::ValueAgent },
    gameplay::{
        constants::{ CODE_CHARS, INITIAL_BOARD },
        encoding::{ board_from_string, create_code_char_hash },
    },
    simulate::environment::{ OthelloEnvironment, OthelloPlayer },
};
use rl_examples::environment::Environment;
use rl_examples::agents::agent::Agent;

pub fn main() {
    let mut env: OthelloEnvironment = OthelloEnvironment::new();
    let end_reward: f64;
    let mut i = 0;
    let player_b: OthelloPlayer = env.get_player_b();
    let player_a = env.get_player_a();
    let mut rule_agent = RuleAgent::new(player_b.turn_id as u8, INITIAL_BOARD);
    let mut value_agent: ValueAgent<Wgpu> = ValueAgent::new(
        player_a.turn_id as u8,
        INITIAL_BOARD,
        WgpuDevice::default()
    );
    println!("Initial board: {}", env.get_state());
    let hash_map = create_code_char_hash(CODE_CHARS);
    let mut temp_reward: f64 = 0.0;
    loop {
        i += 1;
        println!("Step {}", i);

        let is_terminal = env.is_terminal();
        if is_terminal {
            end_reward = temp_reward;
            break;
        }
        // get state
        let board_raw = env.get_state();
        let board = board_from_string(board_raw.as_str(), &hash_map);
        let current_turn_id = env.get_current_turn_id();
        let action: usize;
        // rule based (agent b) turn
        if current_turn_id == (player_b.turn_id as u8) {
            rule_agent.update_board(board);
            let rule_based_action = rule_agent.select_action();
            action = rule_based_action;
        } else {
            // value based (agent a) turn
            let possible_actions = env.get_actions();
            value_agent.update_board(board);
            value_agent.update_possible_move_indices(possible_actions);
            let value_based_action = value_agent.select_action();
            let win_prob = value_agent.get_win_probability();
            println!("Win probability: {}", win_prob);
            action = value_based_action;
        }
        temp_reward = env.step(action);
    }
    println!("End reward: {}", end_reward);
    println!("Player A: {:?}", player_a);
    println!("Player B: {:?}", player_b);
}
