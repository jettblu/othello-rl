use super::constants::{ DEFAULT_BOARD_HEIGHT, DEFAULT_BOARD_WIDTH };

pub struct IPosition {
    // can also represent a vector movement
    pub rightwards: i8,
    pub downwards: i8,
}

impl IPosition {
    // add another position to this position
    pub fn add(&mut self, other: IPosition) {
        self.rightwards += other.rightwards;
        self.downwards += other.downwards;
    }

    // duplicate this position
    pub fn duplicate(&self) -> IPosition {
        IPosition {
            rightwards: self.rightwards,
            downwards: self.downwards,
        }
    }
    ///
    /// Converts a 1d piece index to a 2d position characterized by rightward and downward movement.
    ///
    /// # Arguments
    ///
    /// * `piece_index` - The index of the piece.
    ///
    pub fn to_piece_index(&self) -> usize {
        (self.downwards as usize) * DEFAULT_BOARD_HEIGHT + (self.rightwards as usize)
    }

    // convert a string position to a piece index
    // e.g. "a1" -> 0, "h8" -> 63
    // returns -1 if invalid position
    //
    // # Arguments
    //
    // * `position` - The position to convert. The position should be a string of length 2 with the first character being a letter from 'a' to 'h' and the second character being a number from '1' to '8'
    pub fn position_from_string_position(position: &str) -> IPositionOption {
        let position = position.chars().collect::<Vec<char>>();
        let rightwards = (position[0] as i8) - ('a' as i8);
        let downwards = (position[1] as i8) - ('1' as i8);
        if
            rightwards < 0 ||
            rightwards >= (DEFAULT_BOARD_WIDTH as i8) ||
            downwards < 0 ||
            downwards >= (DEFAULT_BOARD_HEIGHT as i8)
        {
            return None;
        }
        Some(IPosition {
            rightwards: rightwards,
            downwards: downwards,
        })
    }

    ///
    /// Converts a 1d piece index to a 2d position characterized by rightward and downward movement.
    ///
    /// # Arguments
    ///
    /// * `piece_index` - The index of the piece.
    ///
    pub fn position_from_piece_index(piece_index: i8) -> IPositionOption {
        if
            piece_index < 0 ||
            piece_index >= (DEFAULT_BOARD_HEIGHT as i8) * (DEFAULT_BOARD_HEIGHT as i8)
        {
            return None;
        }
        Some(IPosition {
            downwards: piece_index / (DEFAULT_BOARD_HEIGHT as i8),
            rightwards: piece_index % (DEFAULT_BOARD_WIDTH as i8),
        })
    }
}

pub type IPositionOption = Option<IPosition>;
