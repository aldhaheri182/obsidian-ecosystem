# 15. TECHNOLOGY STACK — PINNED VERSIONS AND DEPENDENCIES

## 15.1 Container Orchestration
- **Development**: Docker Compose 2.27+
- **Production**: Kubernetes 1.31+
- **Service Mesh**: Istio 1.23+ (production)
- **CI/CD**: GitHub Actions + ArgoCD 2.10+

## 15.2 Message Bus
- **NATS**: 2.11+ with JetStream
- **NATS WebSocket Gateway**: For browser visualization

## 15.3 Data Stores

| Store | Technology | Version |
|:------|:-----------|:--------|
| Ledger | Custom Rust (RocksDB + S3) | — |
| Relational + Time-Series | PostgreSQL + TimescaleDB | 16.4 + 2.16 |
| Graph | Neo4j Community / Apache AGE | 5.22 / 1.5 |
| Vector | Qdrant | 1.11 |
| Cache | Redis Cluster | 7.4 |
| Analytics | ClickHouse | 24.8 |
| Blob | MinIO / S3 | 2024-10 |

## 15.4 Programming Languages

| Language | Version | Key Libraries | Used For |
|:---------|:--------|:--------------|:---------|
| Rust | 1.82 | tokio 1.41, async-nats 0.36, prost, rocksdb, ed25519-dalek | Ledger, Tape, Risk, Execution, Collectors, Time Oracle |
| Python | 3.12 | nats-py 2.8, pydantic 2.9, FastAPI, PyTorch 2.5, scikit-learn | Signals, ML, Portfolio, Executives, Memory Keepers, Brokers |
| TypeScript | Node 22+ | Svelte 5, PixiJS 8, Three.js 168, Vite, nats.ws 1.29 | Visualization (v1) |
| TypeScript | Node 22+ | Next.js 14.2, React 18, @react-three/fiber 8.16, @react-three/drei 9.105, @react-three/postprocessing 2.16, three 0.164, framer-motion 11.1, zustand 4.5, recharts 2.12, gsap 3.12, @react-spring/three 9.7, tailwindcss 3.4, lucide-react, clsx | Command Center (MV — 3D Interactive rebuild) |

## 15.5 Machine Learning & AI
- **LLM**: Claude Sonnet 4 (Anthropic API) for executive reasoning; Llama 3.2 (Ollama) for local fallback
- **Embeddings**: text-embedding-3-large (OpenAI) or bge-large-en-v1.5 (local)
- **Causal Inference**: DoWhy 0.12, EconML 0.15
- **Computer Vision**: YOLOv8, Segmentation Anything for satellite imagery

## 15.6 Monitoring & Observability
- **Metrics**: Prometheus 2.55 + Grafana 11.3
- **Tracing**: OpenTelemetry Collector 0.110 + Jaeger 1.60
- **Logs**: Loki 3.2 + Vector 0.42
- **Alerts**: Alertmanager 0.28
