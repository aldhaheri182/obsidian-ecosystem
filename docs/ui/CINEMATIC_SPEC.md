# Cinematic UI Specification — v1 (Svelte + PixiJS + Three.js)

Canonical source for the v1 "Observatory" visualization.

See also: [`../COMMAND_CENTER.md`](../COMMAND_CENTER.md) for the MV rebuild (Next.js + React Three Fiber).

## Master palette

| Name | Hex | Use |
|:-----|:----|:----|
| Void Black | `#0A0A0F` | deepest background |
| Abyss Blue | `#121624` | panels, city shadows |
| Verdigris | `#4ECDC4` | active agents, buys |
| Ember | `#FF6B35` | sells, volatility |
| Crimson Forge | `#E63946` | risk, emergency |
| Solar Gold | `#FFD166` | owner, advancements |
| Lunar Silver | `#E0E0E0` | primary text |
| Ghost White | `#F8F9FA` | emphasis |
| Deep Amethyst | `#7209B7` | dreaming / sim |
| Cyan Aurora | `#00F5D4` | data flows / insights |
| Ash Grey | `#6C757D` | retired / deprecated |

## Six view layers

| Layer | Scale | Tech |
|:------|:------|:-----|
| Orbit | planet | PixiJS 2D |
| Nexus Overworld | continent | PixiJS 2D |
| City View | city | Three.js 3D iso |
| Building View | building | Three.js 3D |
| Agent View | agent | Three.js + Svelte |
| Memory Node View | node | Svelte (CSS) |

## Typography

| Use | Font | Size |
|:----|:-----|:-----|
| Body / metrics | Inter | 10–14 px |
| Code / timestamps | JetBrains Mono | 10–13 px |
| Ceremonial | Cinzel | 14–64 px |

## Motion curves

- Agent movement: `cubic-bezier(0.4, 0, 0.2, 1)`.
- Message packets: `cubic-bezier(0, 0, 0.2, 1)`.
- UI panels: `cubic-bezier(0.33, 0, 0.67, 1)`.
- Alerts: spring (mass 1, stiffness 300, damping 20).
- Building breath: 0.5% scale, 4 s sine.
- Status auras: 1.5 s alpha pulse (0.15–0.5).

## Audio

Ambient drones (C2 / G2), 50 ms message whoosh, C-E-G advancement chime, 80+1200 Hz risk alarm, birth / retirement bells, open / close market bells, emergency-stop 55 Hz deep tone.

## Day / night / weekend

- Market hours: full brightness.
- Dusk: 90-min transition.
- Night: amethyst ambient.
- Dawn: 270-min recovery.
- Weekends: Dreamtime aurora overlay (L37).

## Weather

- Dust motes (always): 200 particles/district, 15% lunar silver.
- Rain (drawdowns): 50–500 particles, scaled by loss.
- Fireflies (Agent Graveyard, night): 20–30 gold, twinkle.

## Rituals (L33)

Genesis Day, Epoch Rollover, Agent Birth / Retirement / Resurrection, Advancement Certification, Board Meeting — each has its own visual + audio signature documented here.

## Owner presence

Crown icon in breadcrumb, Global Executive Spire glows solid solar gold, Corporate Towers show a small crown in penthouse windows.

## Emergency Stop

Prominent red button, always visible. 3-second hold to confirm. Publishes `risk.override.all` FLATTEN_ALL. 24-hour cooldown is triggered on any Owner manual intervention.
