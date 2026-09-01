FROM rust:1-bookworm AS builder
WORKDIR /app
COPY Cargo.toml Cargo.lock ./
COPY othello_server ./othello_server
COPY othello_agent ./othello_agent
RUN cargo build --release -p othello_server

FROM debian:bookworm-slim
RUN apt-get update \
    && apt-get install -y --no-install-recommends ca-certificates \
    && rm -rf /var/lib/apt/lists/*
COPY --from=builder /app/target/release/othello_server /usr/local/bin/othello_server
ENV PORT=8080
EXPOSE 8080
CMD ["othello_server"]
