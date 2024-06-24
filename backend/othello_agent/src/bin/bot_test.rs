use core::panic;

use burn::backend::{ wgpu::WgpuDevice, Autodiff, Wgpu };
use othello_agent::{
    agent::{ rule_based::RuleAgent, value_based::ValueAgent },
    gameplay::{
        constants::{ CODE_CHARS, INITIAL_BOARD },
        encoding::{ board_from_string, create_code_char_hash },
    },
    simulate::{ environment::{ OthelloEnvironment, OthelloPlayer }, history::GameHistoryStore },
};
use rl_examples::environment::Environment;
use rl_examples::agents::agent::Agent;

// TODO: use unique id for each player that is constant throughout the game
// TODO: start each game in random, valid state
pub fn main() {
    let mut env: OthelloEnvironment = OthelloEnvironment::new();
    let player_b: OthelloPlayer = env.get_player_b();
    let player_a = env.get_player_a();
    let mut value_agent: ValueAgent<Autodiff<Wgpu>> = ValueAgent::new(
        player_a.turn_id as u8,
        INITIAL_BOARD,
        WgpuDevice::default()
    );
    let mut rule_agent = RuleAgent::new(player_b.turn_id as u8, INITIAL_BOARD);

    let mut store = GameHistoryStore::new();
    let hash_map = create_code_char_hash(CODE_CHARS);
    const MAX_NUMBER_GAMES: usize = 100;
    // hard limit on number of moves per game.... should never reach this
    const MAX_NUMBER_STEPS: usize = 1000;
    let mut bot_wins_count: usize = 0;
    let mut millisecs_per_game: Vec<i32> = Vec::new();
    let mut bot_scores: Vec<i16> = Vec::new();
    let mut rule_scores: Vec<i16> = Vec::new();
    for i in 0..MAX_NUMBER_GAMES {
        if i % 10 == 0 {
            println!("Game number: {}", i);
        }
        let mut step_count = 0;
        let now = std::time::Instant::now();
        loop {
            let is_terminal = env.is_terminal();
            if is_terminal {
                let elapsed = now.elapsed();
                let elapsed_millisecs = elapsed.as_millis() as u32;
                millisecs_per_game.push(elapsed_millisecs as i32);
                let game_history = env.get_game_history();
                let new_bot_score;
                let new_rule_score;
                // update scores based on player id
                if value_agent.get_player() == 0 && rule_agent.get_player() == 1 {
                    new_bot_score = game_history.agent0_score;
                    new_rule_score = game_history.agent1_score;
                } else {
                    new_bot_score = game_history.agent1_score;
                    new_rule_score = game_history.agent0_score;
                }
                // update list of scores
                bot_scores.push(new_bot_score);
                rule_scores.push(new_rule_score);
                // update wins counts
                if new_bot_score > new_rule_score {
                    bot_wins_count += 1;
                }

                store.add_game(game_history);
                // update with random board
                env.reset_with_random_board();
                // update turn ids for players
                let player_b = env.get_player_b();
                let player_a = env.get_player_a();
                value_agent.update_player(player_a.turn_id as u8);
                rule_agent.update_player(player_b.turn_id as u8);
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
                value_agent.update_possible_move_indices(possible_actions.clone());
                // uncomment below to select random action
                // let random = rand::random::<usize>();
                // let value_based_index = random % possible_actions.len();
                // let value_based_action = possible_actions[value_based_index];

                let value_based_action = value_agent.select_action();
                let win_prob = value_agent.get_win_probability();
                println!("Win probability: {}", win_prob);
                action = value_based_action;
            }
            _ = env.step(action);
            step_count += 1;
            if step_count > MAX_NUMBER_STEPS {
                panic!("Exceeded maximum number of steps");
            }
        }
    }
    let total_millisecs: i32 = millisecs_per_game.iter().sum();
    let avg_number_millisecs = total_millisecs / (MAX_NUMBER_GAMES as i32);
    let avg_bot_score: f32 = (bot_scores.iter().sum::<i16>() as f32) / (MAX_NUMBER_GAMES as f32);
    let avg_rule_score: f32 = (rule_scores.iter().sum::<i16>() as f32) / (MAX_NUMBER_GAMES as f32);
    println!("Games complete");
    println!("Average number of milliseconds per game: {}", avg_number_millisecs);
    println!("Bot wins {} out of {} games", bot_wins_count, MAX_NUMBER_GAMES);
    println!("Average bot score: {}", avg_bot_score);
    println!("Average rule score: {}", avg_rule_score);
    println!("Number of scores recorded: {}", bot_scores.len());
}
