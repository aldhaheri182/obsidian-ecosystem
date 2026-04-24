# 4. THE CORPORATE HIERARCHY MODEL

## 4.1 Organizational Structure

```
OWNER (You)
  │
  └─── GLOBAL EXECUTIVE COMMITTEE (GEC)
       │
       ├── Global CEO ─── Coordinates all 11 cities, speaks for the ecosystem
       ├── Global CFO ─── Aggregate P&L, cross-city capital allocation
       ├── Global CRO ─── Ecosystem-wide risk, has ultimate veto over all trading
       │
       └─── CITY CEOs (11)
            │
            └─── CITY BOARD MEMBERS
                 ├── CFO ─── City P&L, resource budget
                 ├── CRO ─── City risk monitoring
                 ├── CSO ─── Strategy innovation
                 ├── CTO ─── Technical infrastructure
                 ├── CCO ─── Regulatory compliance
                 └── CDO ─── Data quality and sourcing
                      │
                      └─── DEPARTMENT HEADS (for larger cities)
                           │
                           └─── EMPLOYEE AGENTS
```

## 4.2 Owner Interaction Protocols

**Formal Command Chain.** The Owner issues directives only to the Global CEO. The Global CEO distributes to relevant City CEOs. City CEOs action through their boards. Responses flow back up the chain. Every directive is logged immutably on the Tape.

**Walkabout Mode.** The Owner can click any employee agent in the visualization and ask questions. The agent responds with its current state, recent work, and reasoning. However, the agent will NOT accept directives during walkabout. If the Owner attempts to give a command, the agent responds: "Acknowledged. I will inform my department head. Formal directives must flow through the executive chain."

**Owner Presence.** When the Owner is connected to the UI, a subtle crown icon appears in the breadcrumb bar, the Global Executive Spire glows solid solar gold, and Corporate Towers show a small crown in their penthouse windows. Agents do not alter their behavior beyond acknowledging the Owner's presence.

**Emergency Override.** The Emergency Stop button (prominent red, always visible) requires a 3-second hold to confirm. It publishes `risk.override.all` with `FLATTEN_ALL`. All positions are immediately liquidated. A 24-hour cooldown is triggered.

**Cooldown Protocol.** Any manual intervention by the Owner that modifies trading parameters triggers a mandatory 24-hour cooldown. During cooldown, the system continues operating but new position entry is paused. This prevents reactive, emotional overrides.

## 4.3 CEO Arbitration Protocol

When board members present conflicting recommendations, the CEO resolves them using a formal arbitration protocol:

```
Input: List of (BoardMember, Recommendation, Confidence)

1. Score each recommendation:
   score = accuracy_weight × historical_accuracy +
           regime_weight × regime_suitability +
           risk_weight × (1 - current_risk_utilization)

2. If any recommendation comes from CRO and risk_utilization > 0.8:
   CRO score *= 10.0  (CRO gets veto weight near limits)

3. Select recommendation with highest score.

4. If top two scores are within 10% of each other:
   Escalate to superior (City CEO → Global CEO).

5. Log decision with full rationale to Tape and board minutes.
```

## 4.4 Board Meeting Simulation

Board meetings are scheduled events:
- **Daily Standup** (15 minutes before market open): Review overnight developments, confirm readiness.
- **Weekly Review**: Full performance analysis, strategy adjustments.
- **Emergency Session**: Triggered by Risk Overlord ORANGE/RED, regime change detection, or Owner command.

During a meeting, board members publish structured memos, the CEO runs arbitration, and meeting minutes are generated as both structured JSON and natural language transcripts.
