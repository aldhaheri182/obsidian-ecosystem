FROM rust:1.82-slim AS build
WORKDIR /build
RUN apt-get update && apt-get install -y --no-install-recommends \
      protobuf-compiler pkg-config libssl-dev clang && \
    rm -rf /var/lib/apt/lists/*
COPY . .
RUN cargo build --release -p tape-recorder

FROM debian:bookworm-slim AS runtime
RUN apt-get update && apt-get install -y --no-install-recommends \
      ca-certificates && rm -rf /var/lib/apt/lists/*
COPY --from=build /build/target/release/tape-recorder /usr/local/bin/tape-recorder
USER 10001:10001
ENTRYPOINT ["/usr/local/bin/tape-recorder"]
