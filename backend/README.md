# Backend

This directory supports a backend server for automated game play.

# Othello Agent

Train an RL agent and suggest moves.

```bash
cargo run -p othello_agent --bin environment
```

```bash
cargo run -p othello_agent --bin data_generate
```

```bash
cargo run -p othello_agent --bin data_split 0.8
```

**Training**

```bash
cargo run -p othello_agent --bin train_win
```

**Bot Battle**

```bash
cargo run -p othello_agent --bin bot_test
```

**Data exploration**

```bash
cargo run -p othello_agent --bin data_exploration
```

**Model Loading Test**

```bash
cargo run -p othello_agent --bin model_win_test
```

# Othello Server

Enables realtime gameplay and provides an API for gameplay requests.
