# Layer 39 — Owner's Hidden Hand

**Core innovation:** Mystery injection and strategic riddles.

The Owner can inject signed, opaque "hidden hand" messages that influence high-level strategic priorities without being fully interpretable to any single agent. This is a mechanism for the Owner to steer the ecosystem with intention while preserving autonomy in execution.

## Mechanism

- A Hidden-Hand envelope contains a signed payload + a public "hint" (natural-language phrase).
- The full payload is visible only to the Global CEO.
- The hint propagates to all city CEOs; each may act on it within their own city.
- Every Hidden-Hand injection is immutably logged; Themis may challenge it.

## Acceptance Criteria

- Owner can inject at most one Hidden-Hand per day.
- Themis may raise a compliance review for any injection.
- Injections that lack a public hint are rejected.
