# obsidian-agent (Python)

Python mirror of `core/obsidian-bus` + `core/obsidian-agent-rs`. Every Python
agent in the Ecosystem imports from this package.

```python
from obsidian_agent import (
    ObsidianAgent, AgentMetadata, AgentContext, Lifecycle,
    Supervisor, AgentSpec, SubscriptionPolicy,
)
from obsidian_agent.bus import (
    SigningKey, VerifyingKey, NatsClient, NatsConfig, VerificationMode,
    canonicalize_envelope, sign_envelope, verify_envelope, EnvelopeBuilder,
)
```

## Generating protobuf bindings

```sh
make proto   # from repo root — regenerates Rust and Python bindings
```

## Running tests

```sh
pip install -e '.[dev]'
pytest
```

The canonicalizer cross-language test (`tests/test_bus_cross_language.py`) loads
`core/obsidian-bus/test-vectors/envelopes.json` and asserts the Python output
matches the Rust output for every vector.
