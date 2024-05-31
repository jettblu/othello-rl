use std::collections::HashMap;

use crate::gameplay::constants::INITIAL_BOARD;

use super::game::{ IBoard, IBoardForML };

///
///
/// Encodes board into string
///
/// # Arguments
///
/// * `board` - board to encode
/// * `code_chars` - string of code characters
///
/// # Note
///
/// Relies on there being 64 characters in the board
pub fn string_from_board(board: IBoard, code_chars: &str) -> String {
    // convert 2d array to 1d array
    let board: Vec<u8> = board
        .iter()
        .flatten()
        .map(|&i| i)
        .collect();
    // convert board to string and append the string 22 to the end
    let joined_board =
        board
            .iter()
            .map(|&i| i.to_string())
            .collect::<String>() + "22";
    let mut chunks = Vec::new();
    let mut i = 0;
    // split the string into chunks of 3
    while i < joined_board.len() {
        let end = std::cmp::min(i + 3, joined_board.len());
        chunks.push(&joined_board[i..end]);
        i += 3;
    }
    // convert each chunk to a number and get the character from the code chars
    chunks
        .iter()
        .map(|x| {
            let index = u8::from_str_radix(x, 3).unwrap() as usize;
            code_chars.chars().nth(index).unwrap()
        })
        .collect()
}

///
/// Decodes string into board
///
/// # Arguments
///
/// * `s` - string to decode
/// * `code_char_hash` - hashmap of code characters
///
/// # Note
///
/// Relies on there being 64 characters in the board
pub fn board_from_string(s: &str, code_char_hash: &HashMap<char, u8>) -> IBoard {
    let mut board: Vec<u8> = s
        .chars()
        .flat_map(|x| {
            let sum = 27 + *code_char_hash.get(&x).unwrap();
            let mut base_3_string = format_radix(sum as u32, 3);
            // clear whitespace
            base_3_string.retain(|c| !c.is_whitespace());
            // slice the last 3 characters
            base_3_string = base_3_string[base_3_string.len() - 3..].to_string();
            base_3_string
                .chars()
                .map(|c| c.to_digit(10).unwrap() as u8)
                .collect::<Vec<_>>()
        })
        .collect();
    board.truncate(64);
    // convert to 2d array
    let mut board_formatted: IBoard = INITIAL_BOARD;
    for (i, &x) in board.iter().enumerate() {
        board_formatted[i / 8][i % 8] = x;
    }
    board_formatted
}

pub fn board_floats_from_string(s: &str, code_char_hash: &HashMap<char, u8>) -> IBoardForML {
    let mut board: Vec<f32> = s
        .chars()
        .flat_map(|x| {
            let sum = 27 + *code_char_hash.get(&x).unwrap();
            let mut base_3_string = format_radix(sum as u32, 3);
            // clear whitespace
            base_3_string.retain(|c| !c.is_whitespace());
            // slice the last 3 characters
            base_3_string = base_3_string[base_3_string.len() - 3..].to_string();
            base_3_string
                .chars()
                .map(|c| c.to_digit(10).unwrap() as f32)
                .collect::<Vec<_>>()
        })
        .collect();
    board.truncate(64);
    // convert to 2d array
    let mut board_formatted: IBoardForML = [[0.0; 8]; 8];
    for (i, &x) in board.iter().enumerate() {
        board_formatted[i / 8][i % 8] = x;
    }
    board_formatted
}

pub fn create_code_char_hash(code_chars: &str) -> HashMap<char, u8> {
    let mut code_char_hash = HashMap::new();
    for (i, c) in code_chars.chars().enumerate() {
        code_char_hash.insert(c, i as u8);
    }
    code_char_hash
}

fn format_radix(mut x: u32, radix: u32) -> String {
    let mut result = vec![];

    loop {
        let m = x % radix;
        x = x / radix;

        // will panic if you use a bad radix (< 2 or > 36).
        result.push(std::char::from_digit(m, radix).unwrap());
        if x == 0 {
            break;
        }
    }
    result.into_iter().rev().collect()
}

#[cfg(test)]
mod tests {
    use crate::gameplay::{
        constants::{ INITIAL_BOARD, CODE_CHARS },
        encoding::{ create_code_char_hash, board_from_string },
    };

    use super::string_from_board;

    #[test]
    fn it_works() {
        let board_str = string_from_board(INITIAL_BOARD, CODE_CHARS);
        assert_eq!(board_str, "---------h-yq---------")
    }
    #[test]
    fn can_encode_and_decode() {
        let board_str = string_from_board(INITIAL_BOARD, CODE_CHARS);
        let hashmap_chars = create_code_char_hash(CODE_CHARS);
        let board_decoded = board_from_string(&board_str, &hashmap_chars);
        assert_eq!(INITIAL_BOARD, board_decoded);
    }
}
