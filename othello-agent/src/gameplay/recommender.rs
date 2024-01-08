use crate::gameplay::types::{ IBoard, IPosition, IPlayer };
use crate::gameplay::constants::{ DEFAULT_CORNER_SCORE, DEFAULT_EDGE_SCORE, DEFAULT_OTHER_SCORE };
use crate::gameplay::utils::{ is_piece_placeholder, worst_score_by_playing_piece_at_index };

pub fn suggest_moves_rules_based(board: IBoard, player: IPlayer) -> Vec<IPosition> {
    let mut best_moves: Vec<IPosition> = Vec::new();
    let mut row_index: i8 = 0;
    let mut col_index: i8 = 0;
    let mut best_worst_case_score: i16 = 32767;
    for row in board.iter() {
        for piece in row.iter() {
            if !is_piece_placeholder(*piece) {
                col_index += 1;
                continue;
            }
            println!("Row: {} Col: {}", row_index, col_index);
            // make move and get score
            let worst_case_score = worst_score_by_playing_piece_at_index(
                board,
                IPosition {
                    downwards: row_index,
                    rightwards: col_index,
                },
                player,
                DEFAULT_CORNER_SCORE,
                DEFAULT_EDGE_SCORE,
                DEFAULT_OTHER_SCORE
            );
            // if move is invalid, skip it
            if worst_case_score.is_none() {
                col_index += 1;
                continue;
            }
            // if move is better than best performance so far, replace it
            if worst_case_score.unwrap() < best_worst_case_score {
                best_worst_case_score = worst_case_score.unwrap();
                best_moves = Vec::new();
                best_moves.push(IPosition {
                    downwards: row_index,
                    rightwards: col_index,
                });
            } else if
                // if move matches best performance so far, add it to the list
                worst_case_score.unwrap() == best_worst_case_score
            {
                best_moves.push(IPosition {
                    downwards: row_index,
                    rightwards: col_index,
                });
            }
            col_index += 1;
        }
        row_index += 1;
        col_index = 0;
    }
    best_moves
}
