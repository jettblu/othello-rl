use crate::gameplay::constants::DIRECTIONS;

use super::{
    constants::DEFAULT_BEST_WORST_CASE_SCORE,
    game::{ IBoard, IPiece, IPlayer },
    position::IPosition,
};

/// Check whether any pieces are flipped by playing at certain position.
pub fn flippable_pieces(board: IBoard, position: &IPosition, player: IPlayer) -> Vec<IPosition> {
    let opponent = 1 - player;
    let mut flippable_pieces: Vec<IPosition> = Vec::new();

    for direction in DIRECTIONS.iter() {
        let mut current_position = position.duplicate();
        current_position.add(direction.duplicate());
        let mut opponent_pieces: Vec<IPosition> = Vec::new();
        while
            current_position.rightwards >= 0 &&
            current_position.rightwards < 8 &&
            current_position.downwards >= 0 &&
            current_position.downwards < 8
        {
            let piece =
                board[current_position.downwards as usize][current_position.rightwards as usize];
            if piece == (opponent as u8) {
                opponent_pieces.push(current_position.duplicate());
            } else if piece == (player as u8) {
                flippable_pieces.append(&mut opponent_pieces);
                break;
            } else {
                break;
            }
            current_position.add(direction.duplicate());
        }
    }
    flippable_pieces
}

///
///
/// Flips all possible pieces in all possible directions with respect to the given position.
///
/// # Arguments
///
/// * `board` - The board to flip pieces on.
/// * `position` - The position to flip pieces with respect to.
/// * `player` - The player to flip pieces for.
pub fn flip_pieces(board: IBoard, position: &IPosition, player: u8) -> IBoard {
    let flippable_pieces = flippable_pieces(board, position, player);
    let mut new_board = board;
    for flippable_piece in flippable_pieces.iter() {
        new_board[flippable_piece.downwards as usize][flippable_piece.rightwards as usize] = player;
    }
    new_board
}

///
/// Computes the score for the given player on the given board. Can give different scores for corner, edge, and other pieces.
///
/// # Arguments
///
/// * `board` - The board to compute the score on.
/// * `player` - The player to compute the score for.
/// * `corner_score` - The score for a corner piece.
/// * `edge_score` - The score for an edge piece.
/// * `other_score` - The score for a non-edge, non-corner piece.
pub fn augmented_score_for_player(
    board: IBoard,
    player: IPlayer,
    corner_score: i16,
    edge_score: i16,
    other_score: i16
) -> i16 {
    let mut row_index = 0;
    let mut col_index: i8 = 0;
    let mut score: i16 = 0;
    for row in board.iter() {
        for piece in row.iter() {
            if *piece == player {
                if row_index == 0 || row_index == 7 {
                    if col_index == 0 || col_index == 7 {
                        score += corner_score;
                    } else {
                        score += edge_score;
                    }
                } else if col_index == 0 || col_index == 7 {
                    score += edge_score;
                } else {
                    score += other_score;
                }
            }
            col_index += 1;
        }
        row_index += 1;
    }
    score
}

pub fn random_board() -> (IBoard, IPlayer, IPlayer) {
    let mut valid_board = false;
    let max_retries = 100000;
    let mut retries = 0;
    let mut board: IBoard = [
        [2, 2, 2, 2, 2, 2, 2, 2],
        [2, 2, 2, 2, 2, 2, 2, 2],
        [2, 2, 2, 2, 2, 2, 2, 2],
        [2, 2, 2, 2, 2, 2, 2, 2],
        [2, 2, 2, 2, 2, 2, 2, 2],
        [2, 2, 2, 2, 2, 2, 2, 2],
        [2, 2, 2, 2, 2, 2, 2, 2],
        [2, 2, 2, 2, 2, 2, 2, 2],
    ];
    let mut last_move: IPlayer = 0;
    let mut player_with_turn: IPlayer = 1;
    // TODO: FIX HOW WE GENERATE BOARD
    // CONSIDER STARTING FROM STANDARD BOARD AND MAKING RANDOM MOVES UNTIL SOME THRESHOLD OF POINTS
    while valid_board == false && retries < 0 {
        for row in board.iter_mut() {
            for piece in row.iter_mut() {
                // randomly assign 0, 1, or 2
                *piece = rand::random::<u8>() % 3;
            }
        }
        // check if either player has a move
        let player_0_has_move = player_has_move(board.clone(), 0);
        let player_1_has_move = player_has_move(board.clone(), 1);
        retries += 1;
        if player_0_has_move && player_1_has_move {
            // randomly assign player with turn
            player_with_turn = rand::random::<u8>() % 2;
            // now iterate through board to find some arbitrary last move
            for row in board.iter() {
                for piece in row.iter() {
                    if *piece == 1 - player_with_turn {
                        last_move = *piece;
                    }
                }
            }
            valid_board = true;
        }
    }
    if !valid_board {
        panic!("Could not generate a valid board after {} retries", max_retries);
    }
    (board, last_move, player_with_turn)
}

pub fn board_by_playing_piece_at_index(
    board: IBoard,
    position: &IPosition,
    player: IPlayer
) -> Option<IBoard> {
    let mut new_board = board;
    let curr_piece = new_board[position.downwards as usize][position.rightwards as usize];
    if !is_piece_placeholder(curr_piece) {
        return None;
    }
    if flippable_pieces(board, &position, player).is_empty() {
        return None;
    }
    // play piece at position
    new_board[position.downwards as usize][position.rightwards as usize] = player;
    Some(flip_pieces(new_board, position, player))
}

///
/// Indicate whether or not a piece is a placeholder piece
///
/// # Arguments
///
/// *`piece` - The piece to evaluate.
pub fn is_piece_placeholder(piece: IPiece) -> bool {
    piece == 2
}

///
/// Indicate whether or not a player has a move on the given board.
///
/// # Arguments
///
/// * `board` - The board to check.
/// * `player` - The player to check.
///
pub fn player_has_move(board: IBoard, player: IPlayer) -> bool {
    let mut row_index: i8 = 0;
    let mut col_index: i8 = 0;
    for row in board.iter() {
        for _ in row.iter() {
            let flippable_pieces = flippable_pieces(
                board,
                &(IPosition {
                    downwards: row_index,
                    rightwards: col_index,
                }),
                player
            );
            if flippable_pieces.len() > 0 {
                return true;
            }
            col_index += 1;
        }
        row_index += 1;
        col_index = 0;
    }
    false
}

///
/// Returns the worst case score for the player after playing the piece at the given index and after an opponent plays their best move.
///
/// # Arguments
///
/// * `board` - The board to play on.
/// * `piece` - The piece to play.
/// * `player` - The player to play.
/// * `corner_score` - The score for a corner piece.
/// * `edge_score` - The score for an edge piece.
/// * `other_score` - The score for a non-edge, non-corner piece.
///
/// # Returns
///
/// * `Option<i16>` - The worst case score for the player after playing the piece at the given index and after an opponent plays their best move.
pub fn worst_score_by_playing_piece_at_index(
    board: IBoard,
    position: IPosition,
    player: IPlayer,
    corner_score: i16,
    edge_score: i16,
    other_score: i16
) -> Option<i16> {
    let board_new = board_by_playing_piece_at_index(board, &position, player);
    if board_new.is_none() {
        return None;
    }
    let new_score = augmented_score_for_player(
        board_new.unwrap(),
        player,
        corner_score,
        edge_score,
        other_score
    );
    let opponent = 1 - player;
    let new_score_oppoenent = augmented_score_for_player(
        board_new.unwrap(),
        1 - player,
        corner_score,
        edge_score,
        other_score
    );
    // how good is this move immediately?
    let tie_break_score: i16 = new_score - new_score_oppoenent;
    let mut row_index = 0;
    let mut col_index: i8 = 0;
    // max number for number type i16
    let mut worst_case_score: i16 = DEFAULT_BEST_WORST_CASE_SCORE;
    for row in board.iter() {
        for piece in row.iter() {
            if !is_piece_placeholder(*piece) {
                col_index += 1;
                continue;
            }
            // make move and get score
            let board_after_opponent_plays = board_by_playing_piece_at_index(
                board,
                &(IPosition {
                    downwards: row_index,
                    rightwards: col_index,
                }),
                opponent
            );
            if board_after_opponent_plays.is_none() {
                col_index += 1;
                continue;
            }
            // opponent score after we have alreadty played one position
            let opponent_score = augmented_score_for_player(
                board_after_opponent_plays.unwrap(),
                opponent,
                corner_score,
                edge_score,
                other_score
            );
            let total_score = new_score - opponent_score + tie_break_score;
            if total_score < worst_case_score {
                worst_case_score = total_score;
            }
            col_index += 1;
        }
        row_index += 1;
        col_index = 0;
    }
    Some(worst_case_score)
}

#[cfg(test)]
mod tests {
    use crate::gameplay::{
        constants::INITIAL_BOARD,
        position::IPosition,
        recommender::suggest_moves_rules_based,
        utils::player_has_move,
    };

    #[test]
    fn can_suggest_moves() {
        let moves = suggest_moves_rules_based(INITIAL_BOARD, 0);
        println!("Suggested {} moves off initial game state", moves.len());
        assert_eq!(moves.len(), 4);
    }

    #[test]
    fn can_detect_player_has_move() {
        let has_move = player_has_move(INITIAL_BOARD, 0);
        assert_eq!(has_move, true);
        let no_move_board = [
            [0, 0, 0, 0, 0, 0, 0, 0],
            [0, 2, 2, 2, 2, 2, 2, 0],
            [0, 2, 2, 2, 2, 2, 2, 0],
            [0, 2, 2, 2, 2, 2, 2, 0],
            [0, 2, 2, 2, 2, 2, 2, 0],
            [0, 2, 2, 2, 2, 2, 2, 0],
            [0, 2, 2, 2, 2, 2, 2, 0],
            [0, 0, 0, 0, 0, 0, 0, 0],
        ];
        let has_move = player_has_move(no_move_board, 0);
        assert_eq!(has_move, false);
    }
    // test piece index conversion
    #[test]
    fn can_convert_piece_index_to_position() {
        let position = IPosition::position_from_piece_index(0);
        assert_eq!(position.is_some(), true);
        assert_eq!(position.unwrap().downwards, 0);
        let position = IPosition::position_from_piece_index(63);
        assert_eq!(position.is_some(), true);
        assert_eq!(position.unwrap().rightwards, 7);
        let position = IPosition::position_from_piece_index(64);
        assert_eq!(position.is_none(), true);
        let position = IPosition::position_from_piece_index(-1);
        assert_eq!(position.is_none(), true);
    }
}
