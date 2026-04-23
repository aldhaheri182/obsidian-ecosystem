# Build: cargo build --release -p time-oracle
# Runtime: distroless Rust with just the binary.

FROM rust:1.88-slim AS build
WORKDIR /build
RUN apt-get update && apt-get install -y --no-install-recommends \
      protobuf-compiler pkg-config libssl-dev clang && \
    rm -rf /var/lib/apt/lists/*
COPY . .
RUN cargo build --release -p time-oracle

FROM debian:bookworm-slim AS runtime
RUN apt-get update && apt-get install -y --no-install-recommends \
      ca-certificates && rm -rf /var/lib/apt/lists/*
COPY --from=build /build/target/release/time-oracle /usr/local/bin/time-oracle
USER 10001:10001
ENTRYPOINT ["/usr/local/bin/time-oracle"]
