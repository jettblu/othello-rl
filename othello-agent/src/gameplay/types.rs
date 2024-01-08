pub type IBoard = [[IPiece; 8]; 8];

// this type can be 0,1,2
pub type IPiece = u8;

pub type IPlayer = u8;

#[allow(dead_code)]
pub struct IGameAttrs {
    pub board_str: String,
    pub last_piece_str: String,
    pub turn_str: String,
}

#[allow(dead_code)]
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
}

pub type IPositionOption = Option<IPosition>;
