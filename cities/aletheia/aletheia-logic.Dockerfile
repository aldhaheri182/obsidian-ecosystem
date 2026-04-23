# aletheia-logic: Python 3.12 container hosting momentum-signal + signal-blender
# + paper-executor as asyncio tasks under the obsidian_agent.Supervisor.

FROM python:3.12-slim AS build
WORKDIR /build
RUN apt-get update && apt-get install -y --no-install-recommends \
      build-essential protobuf-compiler && rm -rf /var/lib/apt/lists/*

COPY proto/ /build/proto/
COPY core/obsidian-agent-py/ /build/core/obsidian-agent-py/
COPY agents/python/ /build/agents/python/
COPY cities/aletheia/aletheia-logic-entrypoint.py /build/entrypoint.py

RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir grpcio-tools==1.66.1

# Regenerate Python proto bindings inside the image so we don't depend on host toolchain.
RUN mkdir -p /build/core/obsidian-agent-py/obsidian_agent/_proto && \
    python -m grpc_tools.protoc \
      -Iproto \
      --python_out=core/obsidian-agent-py/obsidian_agent/_proto \
      --pyi_out=core/obsidian-agent-py/obsidian_agent/_proto \
      proto/envelope.proto proto/market_data.proto proto/signal.proto \
      proto/order.proto proto/risk.proto proto/heartbeat.proto && \
    touch core/obsidian-agent-py/obsidian_agent/_proto/__init__.py

RUN pip install --no-cache-dir -e core/obsidian-agent-py && \
    pip install --no-cache-dir -e agents/python/momentum-signal && \
    pip install --no-cache-dir -e agents/python/signal-blender && \
    pip install --no-cache-dir -e agents/python/paper-executor

FROM python:3.12-slim AS runtime
WORKDIR /app
COPY --from=build /usr/local/lib/python3.12/site-packages /usr/local/lib/python3.12/site-packages
COPY --from=build /build/entrypoint.py /app/entrypoint.py
COPY --from=build /build/core/obsidian-agent-py /app/core/obsidian-agent-py
COPY --from=build /build/agents/python /app/agents/python

RUN useradd -u 10001 obsidian || true
USER 10001:10001
ENTRYPOINT ["python", "/app/entrypoint.py"]
