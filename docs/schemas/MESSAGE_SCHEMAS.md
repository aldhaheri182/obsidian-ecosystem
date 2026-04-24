# Message Schemas — full catalog

Canonical source for all message types on the NATS bus.

See: whitepaper §6, §12. Envelope defined in `proto/envelope.proto`; per-type payload protos live alongside.

## Envelope (all 13 fields)

```protobuf
message Envelope {
  string message_id = 1;
  string correlation_id = 2;
  string source_agent_id = 3;
  string source_city = 4;
  string target_topic = 5;
  google.protobuf.Timestamp timestamp = 6;
  Priority priority = 7;
  MessageType type = 8;
  bytes payload = 9;
  repeated string causal_message_ids = 10;
  string schema_version = 11;
  bytes nonce = 12;
  bytes signature = 13;
}
```

## MessageType enum (1-based; zero reserved for UNSPECIFIED)

| # | Name | Payload |
|:--|:-----|:--------|
| 1 | MARKET_DATA | `MarketData` |
| 2 | SIGNAL | `Signal` |
| 3 | ORDER_REQUEST | `OrderRequest` |
| 4 | FILL_REPORT | `FillReport` |
| 5 | RISK_OVERRIDE | `RiskOverride` |
| 6 | HEARTBEAT | `Heartbeat` |
| 7 | EXECUTIVE_DIRECTIVE | `ExecutiveDirective` |
| 8 | EXECUTIVE_REPORT | `ExecutiveReport` |
| 9 | KNOWLEDGE_PUBLICATION | `KnowledgePublication` |
| 10 | ADVANCEMENT_ORB | `AdvancementOrb` |
| 11 | ALERT | `Alert` |
| 12 | QUERY | `KnowledgeQuery` |
| 13 | QUERY_RESPONSE | `KnowledgeResponse` |
| 14 | REFLECTION | `Reflection` |
| 15 | DREAM_RESULT | `DreamResult` |

## Topic naming

```
{city}.{district}.{building}.{agent_role}.{action}
```

Wildcards only for tape-recorder (`>`) and supervisors.

## Canonical signing

1. Sort fields by tag.
2. Pack repeated fields.
3. Include `bytes` fields with length prefix even if zero-length.
4. Ed25519 over canonical bytes.
5. Fresh 16-byte `nonce` per message.

Cross-language test vectors: `core/obsidian-bus/test-vectors/envelopes.json`.

## Price representation

All prices are `int64` micro-cents (USD cents × 10⁶). Floating-point is never used for prices.

## Timestamps

Nanosecond precision via Hybrid Logical Clock (Chronos). Physical wall-clock + logical counter.

## Full payload examples

See whitepaper §12 sections 12.1–12.9 for JSON form of MarketData, Signal, OrderRequest, FillReport, RiskOverride, Heartbeat, ExecutiveDirective, KnowledgePublication, Reflection.
