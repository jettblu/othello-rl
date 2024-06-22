use super::{
    constants::{ CODE_CHARS, INITIAL_BOARD },
    encoding::string_from_board,
    position::IPosition,
    utils::{
        augmented_score_for_player,
        board_by_playing_piece_at_index,
        flippable_pieces,
        is_piece_placeholder,
    },
};

// this type can be 0,1,2
pub type IPiece = u8;

pub type IPlayer = u8;

pub type IBoard = [[IPiece; 8]; 8];

pub fn board_to_ml_input(board: IBoard) -> IBoardForML {
    let mut ml_input: IBoardForML = [[0.0; 8]; 8];
    for row_index in 0..8 {
        for col_index in 0..8 {
            let piece = board[row_index][col_index];
            let value = match piece {
                0 => 1.0,
                1 => -1.0,
                _ => 0.0,
            };
            ml_input[row_index][col_index] = value;
        }
    }
    ml_input
}

pub type IBoardForML = [[f32; 8]; 8];

pub struct IGame {
    pub board: IBoard,
    pub last_piece: IPiece,
    pub turn: IPlayer,
}

impl IGame {
    pub fn new() -> IGame {
        IGame {
            board: INITIAL_BOARD,
            last_piece: 0,
            turn: 0,
        }
    }
    pub fn get_valid_moves(&self, player: IPlayer) -> Vec<IPosition> {
        let mut valid_moves: Vec<IPosition> = Vec::new();
        for row_index in 0..8 {
            for col_index in 0..8 {
                let position = IPosition {
                    downwards: row_index as i8,
                    rightwards: col_index as i8,
                };
                // if already a piece at position, skip
                let is_placeholder = is_piece_placeholder(self.board[row_index][col_index]);
                if !is_placeholder {
                    continue;
                }
                let flippable_positions = flippable_pieces(self.board, &position, player);
                if flippable_positions.len() > 0 {
                    valid_moves.push(position);
                }
            }
        }
        valid_moves
    }

    ///
    /// Makes a move at a given position.
    ///
    /// # Arguments
    ///
    /// * `position` - The position to make the move at.
    ///
    /// # Panics
    ///
    /// Panics if the move is invalid.
    pub fn make_move_at_position(&mut self, position: &IPosition) {
        let flippeable_positions = flippable_pieces(self.board, &position, self.turn);
        if flippeable_positions.len() == 0 {
            panic!("Invalid move");
        }
        let board = board_by_playing_piece_at_index(self.board, &position, self.turn);
        if board.is_none() {
            panic!("Invalid move");
        }
        self.board = board.unwrap();
        self.last_piece = position.to_piece_index() as u8;
        self.turn = 1 - self.turn;
    }

    pub fn player_has_move(&self, player: IPlayer) -> bool {
        let valid_moves = self.get_valid_moves(player);
        valid_moves.len() > 0
    }

    pub fn get_board_string(&self) -> String {
        string_from_board(self.board, CODE_CHARS)
    }

    pub fn toggle_turn(&mut self) {
        self.turn = 1 - self.turn;
    }

    pub fn score_for_player(&self, player: IPlayer) -> i16 {
        let score = augmented_score_for_player(self.board, player, 1, 1, 1);
        score
    }
}
