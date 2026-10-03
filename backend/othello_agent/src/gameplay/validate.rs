use super::game::IGame;
use super::position::IPosition;

const MIN_PLIES: usize = 4;
const MAX_PLIES: usize = 60;

fn disc_count(board: super::game::IBoard, player: u8) -> u16 {
    let mut n = 0u16;
    for row in board.iter() {
        for &piece in row.iter() {
            if piece == player {
                n += 1;
            }
        }
    }
    n
}

fn update_pass_state(game: &mut IGame) -> (bool, bool) {
    let mut a_has = game.player_has_move(0);
    let mut b_has = game.player_has_move(1);
    if game.turn == 0 && !a_has {
        game.toggle_turn();
    } else if game.turn == 1 && !b_has {
        game.toggle_turn();
    }
    a_has = game.player_has_move(0);
    b_has = game.player_has_move(1);
    (a_has, b_has)
}

/// Replay `game_moves` (concatenated a1–h8 squares). Returns final disc counts when the game is terminal.
pub fn replay_game_moves(game_moves: &str) -> Option<(u16, u16)> {
    if !game_moves.is_ascii() || game_moves.is_empty() || game_moves.len() % 2 != 0 {
        return None;
    }
    let ply_count = game_moves.len() / 2;
    if ply_count < MIN_PLIES || ply_count > MAX_PLIES {
        return None;
    }

    let mut game = IGame::new();
    for i in 0..ply_count {
        let sq = &game_moves[i * 2..i * 2 + 2];
        let position = IPosition::position_from_string_position(sq)?;
        let index = position.to_piece_index();
        let legal = game
            .get_valid_moves(game.turn)
            .into_iter()
            .any(|p| p.to_piece_index() == index);
        if !legal {
            return None;
        }
        game.make_move_at_position(&position);
        let (a_has, b_has) = update_pass_state(&mut game);
        if !a_has && !b_has {
            if i + 1 != ply_count {
                return None;
            }
            break;
        }
    }

    let (a_has, b_has) = update_pass_state(&mut game);
    if a_has || b_has {
        return None;
    }

    Some((disc_count(game.board, 0), disc_count(game.board, 1)))
}

/// `winner`: 0 black, 1 white, 2 draw. `scores` are [black_discs, white_discs].
pub fn validate_game_record(game_moves: &str, scores: [u16; 2], winner: u8) -> bool {
    if winner > 2 {
        return false;
    }
    let Some((black, white)) = replay_game_moves(game_moves) else {
        return false;
    };
    if scores[0] != black || scores[1] != white {
        return false;
    }
    let expected = if black > white {
        0
    } else if white > black {
        1
    } else {
        2
    };
    winner == expected
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn rejects_odd_move_string() {
        assert!(!validate_game_record("f5d", [0, 0], 0));
    }

    #[test]
    fn accepts_complete_legal_game() {
        let mut game = IGame::new();
        let mut moves = String::new();
        loop {
            let legal = game.get_valid_moves(game.turn);
            if legal.is_empty() {
                game.toggle_turn();
                if game.get_valid_moves(game.turn).is_empty() {
                    break;
                }
                continue;
            }
            let position = &legal[0];
            moves.push((b'a' + position.rightwards as u8) as char);
            moves.push((b'1' + position.downwards as u8) as char);
            game.make_move_at_position(position);
        }
        let scores = [disc_count(game.board, 0), disc_count(game.board, 1)];
        let winner = if scores[0] > scores[1] {
            0
        } else if scores[1] > scores[0] {
            1
        } else {
            2
        };
        assert!(validate_game_record(&moves, scores, winner));
    }

    #[test]
    fn rejects_non_ascii_without_panicking() {
        assert_eq!(replay_game_moves("éé"), None);
    }
}
