use crate::gameplay::constants::CODE_CHARS;
use crate::gameplay::encoding::string_from_board;
use crate::gameplay::game::IBoard;
use crate::gameplay::utils::augmented_score_for_player;

pub struct GameHistory {
    // board history.. vector of encoded boards
    pub board_history: Vec<String>,
    // total number of moves
    pub total_moves: u16,
    // scores for both players
    pub agent0_score: i8,
    pub agent1_score: i8,
    // id of game... should be autoincremented
    pub id: u32,
}

impl GameHistory {
    pub fn new() -> Self {
        GameHistory {
            board_history: Vec::new(),
            total_moves: 0,
            agent0_score: 0,
            agent1_score: 0,
            id: 0,
        }
    }
    pub fn set_scores(&mut self, agent0_score: i8, agent1_score: i8) {
        self.agent0_score = agent0_score;
        self.agent1_score = agent1_score;
    }
    pub fn set_id(&mut self, id: u32) {
        self.id = id;
    }
    pub fn add_board(&mut self, board: IBoard, set_scores: bool) {
        self.board_history.push(string_from_board(board, CODE_CHARS));
        self.total_moves += 1;
        if !set_scores {
            return;
        }
        // compute scores for both players
        let agent0_score = augmented_score_for_player(board, 0, 1, 1, 1);
        let agent1_score = augmented_score_for_player(board, 1, 1, 1, 1);
        self.set_scores(agent0_score, agent1_score);
    }
}

// add method to print summary of game history
// summary will include total moves, scores, and id
impl std::fmt::Display for GameHistory {
    fn fmt(&self, f: &mut std::fmt::Formatter) -> std::fmt::Result {
        write!(
            f,
            "Game History: id: {}, total moves: {}, agent0 score: {}, agent1 score: {}",
            self.id,
            self.total_moves,
            self.agent0_score,
            self.agent1_score
        )
    }
}

pub struct GameHistoryStore {
    pub history: Vec<GameHistory>,
    pub total_games: u32,
}

impl GameHistoryStore {
    pub fn new() -> Self {
        GameHistoryStore {
            history: Vec::new(),
            total_games: 0,
        }
    }
    // print summary of all games in history
    pub fn print_summary(&self) {
        println!("Game History SUmmary");
        println!("Total games: {}", self.total_games);
        for game in self.history.iter() {
            println!("{}", game);
        }
    }
    // add game to history
    pub fn add_game(&mut self, game: GameHistory) {
        self.history.push(game);
        self.total_games += 1;
    }

    // get last game in history
    pub fn last_game(&self) -> Option<&GameHistory> {
        self.history.last()
    }
}
