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

Realtime WebSocket rooms for remote games. Binds `0.0.0.0:$PORT` (default `8001`).

```bash
cargo run -p othello_server
```

Deploy from this directory with Fly (`fly.toml` + `Dockerfile`):

```bash
fly deploy
```

### Gameplay logs (Tigris)

```bash
fly storage create
fly secrets set \
  BUCKET_NAME=your-bucket \
  AWS_ACCESS_KEY_ID=... \
  AWS_SECRET_ACCESS_KEY=... \
  AWS_ENDPOINT_URL_S3=...
```

Completed games are validated and rate-limited at `POST /api/games`, then written to
`games/{id}.json`. Export objects and run:

```bash
node scripts/game_log_to_csv.mjs ./exported > data/othello_dataset.csv
cargo run -p othello_agent --bin data_generate
```
