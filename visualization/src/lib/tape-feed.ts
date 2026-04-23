// ============================================================================
// visualization/src/lib/tape-feed.ts
// Bounded ring buffer of recent envelopes for the sidebar log.
// ============================================================================

import type { DisplayMessage } from "./nats-client";

export class TapeFeed {
  private buf: DisplayMessage[] = [];
  constructor(private cap: number) {}

  push(m: DisplayMessage): void {
    this.buf.push(m);
    if (this.buf.length > this.cap) this.buf.shift();
  }

  entries(): DisplayMessage[] {
    return [...this.buf].reverse();
  }
}
