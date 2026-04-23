# aletheia-core: Rust container hosting collector-equities-csv + risk-overlord
# as supervised agents (one tokio runtime, per ADR 0002).

FROM rust:1.82-slim AS build
WORKDIR /build
RUN apt-get update && apt-get install -y --no-install-recommends \
      protobuf-compiler pkg-config libssl-dev libclang-dev clang && \
    rm -rf /var/lib/apt/lists/*
COPY . .
RUN cargo build --release -p collector-equities-csv -p risk-overlord

FROM debian:bookworm-slim AS runtime
RUN apt-get update && apt-get install -y --no-install-recommends \
      ca-certificates libssl3 && rm -rf /var/lib/apt/lists/*
COPY --from=build /build/target/release/collector-equities-csv /usr/local/bin/
COPY --from=build /build/target/release/risk-overlord /usr/local/bin/
COPY cities/aletheia/aletheia-core-entrypoint.sh /usr/local/bin/aletheia-core
RUN chmod +x /usr/local/bin/aletheia-core
USER 10001:10001
ENTRYPOINT ["/usr/local/bin/aletheia-core"]
