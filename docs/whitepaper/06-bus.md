# 6. THE MESSAGE BUS AND COMMUNICATION PROTOCOLS

## 6.1 NATS Configuration

- **Cluster**: 5 nodes minimum for production.
- **JetStream**: Enabled with 30-day retention for critical streams.
- **WebSocket Gateway**: For browser visualization connection.
- **Authentication**: JWT with NKeys per agent. Every agent has its own Ed25519 keypair.

## 6.2 Protobuf Envelope

Every message on the bus is wrapped in a standard Envelope:

```protobuf
message Envelope {
  string message_id = 1;            // UUID v7
  string correlation_id = 2;        // For request-response chains
  string source_agent_id = 3;       // Who sent this
  string source_city = 4;           // Which city
  string target_topic = 5;          // NATS topic
  google.protobuf.Timestamp timestamp = 6;
  Priority priority = 7;            // LOW, NORMAL, HIGH, CRITICAL
  MessageType type = 8;             // 17 message types
  bytes payload = 9;                // Type-specific protobuf
  repeated string causal_message_ids = 10;  // What caused this message
  string schema_version = 11;       // For forward compatibility
  bytes nonce = 12;                 // 16 random bytes for signature freshness
  bytes signature = 13;             // Ed25519 over canonical bytes of fields 1-12
}
```

## 6.3 Message Types

| Enum Value | Type | Purpose |
|:-----------|:-----|:--------|
| 1 | MARKET_DATA | Real-time price and volume from exchanges |
| 2 | SIGNAL | Alpha output from a Signal Agent |
| 3 | ORDER_REQUEST | Request to place an order |
| 4 | FILL_REPORT | Confirmation of a filled order |
| 5 | RISK_OVERRIDE | Risk Overlord command to scale/kill/flatten/pause |
| 6 | HEARTBEAT | Agent liveness signal at 1Hz |
| 7 | EXECUTIVE_DIRECTIVE | Command from Owner or executive |
| 8 | EXECUTIVE_REPORT | Board meeting output or status report |
| 9 | KNOWLEDGE_PUBLICATION | New principle or pattern published to Mnemosyne |
| 10 | ADVANCEMENT_ORB | Certified advancement broadcast to cities |
| 11 | ALERT | System alert from Iris or Risk Overlord |
| 12 | QUERY | Request to the Knowledge Graph |
| 13 | QUERY_RESPONSE | Response from the Knowledge Graph |
| 14 | REFLECTION | Agent's daily reflection output |
| 15 | DREAM_RESULT | Results from a Dream Room session |

## 6.4 Topic Naming Convention

```
{city}.{district}.{building}.{agent_role}.{action}
```

Examples:
- `aletheia.data.us_equities.AAPL`
- `aletheia.trading_floor.momentum_lab.momentum.alpha`
- `aletheia.execution.order_request`
- `aletheia.execution.fill_report`
- `risk.override.all`
- `system.heartbeat.momentum-agent-01`
- `executive.global.ceo.directive`
- `mnemosyne.great_library.knowledge_graph.publication`
- `advancement.orb.aletheia`

## 6.5 Canonical Signing

Because Protobuf wire format is not deterministic across implementations, the ecosystem uses a custom canonical serializer for signing:

1. Sort fields by tag number.
2. Pack all repeated fields.
3. Handle `bytes` fields specially (include length + data even if zero-length, since `nonce` and `signature` are `bytes` fields that must be part of the signed payload).
4. Compute Ed25519 signature over the canonical bytes.
5. Include a fresh 16-byte random `nonce` in every message to prevent replay attacks.

This canonical serialization is implemented in both Rust (`core/obsidian-bus`) and Python (`core/obsidian-agent-py`) and tested for byte-for-byte equivalence via cross-language test vectors.

## 6.6 The Tape Recorder

A dedicated Rust service that subscribes to the wildcard topic `>` (all messages) and writes every Envelope to:

1. **ClickHouse** `tape` table for structured querying and replay.
2. **S3** for long-term immutable archival.

The Tape provides a gRPC API: `Replay(start_time, end_time, filter_topic)` that returns an ordered stream of messages. This enables deterministic replay of any historical period.
