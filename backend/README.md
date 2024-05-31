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

# Othello Server

Enables realtime gameplay and provides an API for gameplay requests.
