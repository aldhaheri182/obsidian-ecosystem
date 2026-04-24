# aletheia-logic: Python 3.12 container hosting momentum-signal + signal-blender
# + paper-executor as asyncio tasks under the obsidian_agent.Supervisor.
#
# Single-stage on purpose — multi-stage with `pip install -e` leaves egg-link
# files that break across image layers.

FROM python:3.12-slim
WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
      build-essential protobuf-compiler && \
    rm -rf /var/lib/apt/lists/*

COPY proto/ /app/proto/
COPY core/obsidian-agent-py/ /app/core/obsidian-agent-py/
COPY agents/python/ /app/agents/python/
COPY cities/aletheia/aletheia-logic-entrypoint.py /app/entrypoint.py

RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir grpcio-tools==1.66.1

# Regenerate Python proto bindings inside the image so we don't depend on host toolchain.
RUN mkdir -p /app/core/obsidian-agent-py/obsidian_agent/_proto && \
    python -m grpc_tools.protoc \
      -Iproto \
      --python_out=core/obsidian-agent-py/obsidian_agent/_proto \
      --pyi_out=core/obsidian-agent-py/obsidian_agent/_proto \
      proto/envelope.proto proto/market_data.proto proto/signal.proto \
      proto/order.proto proto/risk.proto proto/heartbeat.proto

# Non-editable install so site-packages owns the code; no egg-links.
RUN pip install --no-cache-dir /app/core/obsidian-agent-py && \
    pip install --no-cache-dir /app/agents/python/momentum-signal && \
    pip install --no-cache-dir /app/agents/python/signal-blender && \
    pip install --no-cache-dir /app/agents/python/paper-executor

RUN useradd -u 10001 obsidian || true
USER 10001:10001
ENTRYPOINT ["python", "/app/entrypoint.py"]
