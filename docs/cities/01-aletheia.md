# City 1: Aletheia — Financial Trading

Aletheia is the heart of the ecosystem. It contains all agents directly involved in market data ingestion, signal generation, portfolio construction, order execution, and risk management. It is the only city that directly interacts with external financial markets.

## Districts

**Trading Floor.** The primary locus of signal generation. Houses all Signal Agents, each implementing a specific strategy archetype. The Trading Floor is a tall glass tower with scrolling ticker tape on its facade displaying recent price movements. Windows light up in verdigris when agents inside are actively computing signals.

**Execution Desk.** Responsible for translating portfolio target weights into concrete orders and managing their lifecycle through to fill. The Execution Desk is a lower, wider building with glowing pipes representing order flow entering and leaving the city. Pipe glow intensity reflects execution activity.

**Portfolio Control.** Houses the Portfolio Optimizer, Capital Allocator, Signal Blender, Regime Detector, and Correlation Monitor. This is a circular building with a holographic projection of the current asset allocation visible through its transparent roof.

**Risk Bunker.** A fortified underground structure housing the Risk Overlord, Circuit Breaker, and Leverage Monitor. Only the entrance is visible at street level — a heavy door surrounded by a crimson ring that pulses at the current risk level's frequency. At RED alert, the ring spins continuously.

**Corporate Tower.** The tallest building in Aletheia. Top-floor CEO office with floor-to-ceiling windows that glow solar gold when the CEO is active. A scrolling banner reads "MEETING IN PROGRESS" when the Aletheia board is convened.

## Agent Inventory

### Collector Agents (Data Ingestion)

- `market-data-collector-us-equities` (Rust): Subscribes to Polygon.io WebSocket, normalizes to MarketData proto, publishes to `aletheia.data.us_equities.{symbol}`. Target throughput: 10,000 messages/second with <1ms internal latency.
- `market-data-collector-futures` (Rust): CME and ICE data via broker API.
- `market-data-collector-fx` (Rust): FX spot and forward rates.
- `market-data-collector-options` (Rust): Options price and Greeks data.
- `market-data-collector-crypto` (Rust): Major cryptocurrency exchange data.
- `corporate-actions-agent` (Python): Processes splits, dividends, mergers, rights offerings, ticker changes. Publishes adjustments to `aletheia.data.corporate_actions.{symbol}`.

### Signal Agents (Alpha Generation)

Each Signal Agent is a self-contained strategy implementation with its own model version, rolling performance metrics, and memory ledger.

- `momentum-signal-*` (Python, multiple instances): Time-series momentum over [1,3,6,12] month lookback windows. Cross-sectional momentum within sectors. Volume confirmation filter. Regime-aware confidence adjustment (reduces confidence when VIX exceeds threshold).
- `mean-reversion-signal-*` (Python): Bollinger Bands, RSI divergence, intraday spread mean-reversion.
- `carry-signal-*` (Python): FX interest rate differential carry, futures roll yield.
- `vol-arb-signal-*` (Python): Implied vs. historical volatility surface comparison, volatility risk premium capture.
- `stat-arb-signal-*` (Python): Cointegration-based pairs trading, PCA-based basket construction.
- `sentiment-signal` (Python, Hugging Face): NLP sentiment scoring via FinBERT on news and social media. Topic modeling. Event extraction from headlines.
- `flow-signal` (Python): Options flow analysis, dark pool print detection, order book imbalance metrics.

### Processing Agents

- `signal-blender` (Python): Weighted ensemble of all active Signal Agent outputs. Weights computed from rolling Sharpe ratios, correlation penalties, and regime adjustments. Publishes blended alpha to `aletheia.portfolio.blended_alpha`.
- `regime-detector` (Python): HMM or deep classifier model on VIX, correlation matrices, yield curve, credit spreads. Classifies market into one of six states: LOW_VOL_BULL, HIGH_VOL_BULL, SIDEWAYS, BEAR, CRISIS, LIQUIDITY_DRYUP. Publishes to `aletheia.portfolio.regime`.
- `correlation-monitor` (Python): 60-day rolling correlation matrix for all held assets. Publishes updates every 5 minutes.

### Allocator Agents

- `portfolio-optimizer` (Python): Constrained mean-variance or risk-parity optimization. Inputs: blended alpha, current positions, correlation matrix, risk limits. Outputs: target portfolio weights.
- `capital-allocator` (Python): Dynamic sub-allocation of capital to different strategy families based on performance.
- `void-agent` (Python): Permanently advocates for cash allocation. Confidence = 1.0 - max_opportunity_score. The system's built-in skeptic.

### Execution Agents

- `order-router` (Rust): Venue selection, order type determination, broker API translation. Minimizes explicit costs (commissions, fees) and implicit costs (spread capture, adverse selection).
- `execution-slicer` (Rust): TWAP/VWAP slicing over configurable horizons. Randomizes slice sizes slightly (±15%) to prevent algorithmic fingerprinting by external actors (Dark Forest Protocol).
- `fill-monitor` (Rust): Compares actual fill prices to arrival price and VWAP benchmarks. Computes implementation shortfall. Publishes execution quality reports.

### Guardian Agents

- `risk-overlord` (Rust): **Hard performance requirement: <100ms p99 from breach detection to override publication.** Maintains real-time portfolio state. Checks every proposed order against all hard limits. Circuit breaker levels: GREEN (normal), YELLOW (80% utilization, warning), ORANGE (breach, scale positions by 50%), RED (multiple breaches or rapid loss, flatten all positions).
- `circuit-breaker` (Rust): Independent monitor for rapid loss events. If P&L drops X% in Y minutes, triggers ORANGE or RED.
- `leverage-monitor` (Rust): Tracks gross/net leverage, margin utilization, concentration risk.

### Aletheia C-Suite

- `ceo-aletheia` (Python, LLM-powered): Receives board reports, produces city strategy, communicates with Global CEO.
- `cro-aletheia` (Python): Monitors risk metrics, escalates to Risk Overlord.
- `cfo-aletheia` (Python): Tracks P&L, capital usage, fees, resource consumption.
- `cso-aletheia` (Python): Identifies new alpha opportunities, commissions Prometheus research.
- `cto-aletheia` (Python): Ensures low-latency data and execution infrastructure.
- `cco-aletheia` (Python): Regulatory compliance oversight.
- `cdo-aletheia` (Python): Data quality and sourcing oversight.

## Visual Metaphor

Aletheia is rendered as a financial district with skyscrapers, ticker tape, glowing execution pipes, and a subterranean Risk Bunker with a crimson pulse. It is the most visually active city during market hours, with message packets streaming constantly between its buildings.

## Command Center Chamber (MV)

- Accent color: Verdigris `#4ECDC4`.
- Interior: Mini trading floor. 3×3 grid of tiny desks with tiny monitors (rotated planes). Central holographic ticker ring rotating with floating stock symbols (text sprites). One podium-mounted agent points at the ticker.
- Agents (6): Suited traders (dark body, white collar), occasionally moving between desks, gesturing (arm raise) every few seconds.
- Animations: Ticker ring continuous rotation; monitor screens flicker with random color blocks.
- Props: 9 desk boxes, 9 monitor planes, 1 podium, 1 ticker ring.
