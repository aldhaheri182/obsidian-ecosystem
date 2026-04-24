# City 6: Agora — External Integration

Agora is the gateway between the ecosystem and the outside world. All broker connections, data vendor relationships, news feeds, and external API traffic flows through Agora.

## Agents

- `api-gateway` (Rust): gRPC-to-NATS bridge for external API consumers. Rate limiting, authentication, request validation.
- `broker-interface-alpaca` (Python): Translates internal OrderRequests to Alpaca API calls.
- `broker-interface-ibkr` (Python): Translates internal OrderRequests to Interactive Brokers API calls.
- `data-vendor-negotiator` (Python): Manages subscriptions, tracks data quality and cost.
- `stargate-immigration` (Python): Accepts external agent registration requests, quarantines for validation, issues visas.
- `external-agent-quarantine-monitor` (Python): Observes quarantined external agents for malicious behavior.
- `news-feed-ingestor` (Python): Subscribes to Reuters, Bloomberg, and web-scraped financial news. Normalizes and publishes to Mnemosyne.

## Federation Protocol (Layer 30)

The Stargate implements a gRPC-based Federation Protocol for connecting multiple Obsidian ecosystems:

- **Handshake**: Exchange capabilities manifest + zero-knowledge performance proofs.
- **Bridge Establishment**: If both ecosystems approve, a cross-ecosystem topic bridge is established.
- **Insight Trading**: Ecosystems can trade anonymized advancements via smart contracts.

## C-Suite

- `ceo-agora` (Python, LLM-powered)
- `cdo-agora`: Data vendor relationship management.
- `cso-agora`: External opportunity scouting.

## Visual Metaphor

A bustling port city with ships (data) arriving at dock, a marketplace with vendor stalls, and a grand Stargate portal at the city's edge where external agents arrive.

## Command Center Chamber (MV)

- Accent color: Ghost White `#F8F9FA`.
- Interior: Small satellite dishes (cones) facing outward. Miniature port with flat-ellipse ships docked.
- Agents (4): Comms gear + headset. Standing by dishes; occasionally a ship moves to the chamber edge and returns.
- Animations: Dishes rotate slowly; ships glide.
- Props: 3 dishes, 2 ships.
