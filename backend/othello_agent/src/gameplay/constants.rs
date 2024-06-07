// create new variable for code characters

use super::{ game::IBoard, position::IPosition };

pub const CODE_CHARS: &str = "234567bcdfghjkmnpqrstvwxyz-";

// create hashmap using code characters
pub const CODE_CHARS_MAP: [(char, i8); 27] = [
    ('2', 0),
    ('3', 1),
    ('4', 2),
    ('5', 3),
    ('6', 4),
    ('7', 5),
    ('b', 6),
    ('c', 7),
    ('d', 8),
    ('f', 9),
    ('g', 10),
    ('h', 11),
    ('j', 12),
    ('k', 13),
    ('m', 14),
    ('n', 15),
    ('p', 16),
    ('q', 17),
    ('r', 18),
    ('s', 19),
    ('t', 20),
    ('v', 21),
    ('w', 22),
    ('x', 23),
    ('y', 24),
    ('z', 25),
    ('-', 26),
];

pub const DIRECTIONS: [IPosition; 8] = [
    IPosition {
        rightwards: 0,
        downwards: 1,
    },
    IPosition {
        rightwards: 1,
        downwards: 1,
    },
    IPosition {
        rightwards: 1,
        downwards: 0,
    },
    IPosition {
        rightwards: 1,
        downwards: -1,
    },
    IPosition {
        rightwards: 0,
        downwards: -1,
    },
    IPosition {
        rightwards: -1,
        downwards: -1,
    },
    IPosition {
        rightwards: -1,
        downwards: 0,
    },
    IPosition {
        rightwards: -1,
        downwards: 1,
    },
];

const X: u8 = 2;
pub const PLACEHOLDER: u8 = X;

pub const INITIAL_BOARD: IBoard = [
    [X, X, X, X, X, X, X, X],
    [X, X, X, X, X, X, X, X],
    [X, X, X, X, X, X, X, X],
    [X, X, X, 1, 0, X, X, X],
    [X, X, X, 0, 1, X, X, X],
    [X, X, X, X, X, X, X, X],
    [X, X, X, X, X, X, X, X],
    [X, X, X, X, X, X, X, X],
];

pub const DEFAULT_CORNER_SCORE: i16 = 12;
pub const DEFAULT_EDGE_SCORE: i16 = 4;
pub const DEFAULT_OTHER_SCORE: i16 = 1;
pub const DEFAULT_BEST_WORST_CASE_SCORE: i16 = 32727;

pub const DEFAULT_BOARD_WIDTH: usize = 8;
pub const DEFAULT_BOARD_HEIGHT: usize = 8;

/// Used in case of no valid move
pub const NULL_MOVE_INDEX: usize = 199;
