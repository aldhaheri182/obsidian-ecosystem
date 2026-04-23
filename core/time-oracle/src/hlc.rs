// ============================================================================
// core/time-oracle/src/hlc.rs
// Authorized by: spec Part 16.
//
// Hybrid Logical Clock: combine a physical time with a logical tiebreaker.
// Monotonic across clock jitter and minor regressions.
// ============================================================================

//! Minimal HLC implementation.

use std::sync::Mutex;

/// A Hybrid Logical Clock tick.
#[derive(Clone, Copy, Debug)]
pub struct HlcTick {
    pub physical_ns: u64,
    pub logical: u32,
}

/// Internal HLC state. `tick()` is monotonic with respect to prior ticks and
/// to the wall clock.
pub struct Hlc {
    state: Mutex<HlcTick>,
}

impl Hlc {
    /// Create a fresh HLC seeded at the current wall clock.
    pub fn new() -> Self {
        Self {
            state: Mutex::new(HlcTick { physical_ns: wall_ns(), logical: 0 }),
        }
    }

    /// Advance and return the next tick.
    pub fn tick(&self) -> HlcTick {
        let wall = wall_ns();
        let mut s = self.state.lock().expect("hlc mutex poisoned");
        if wall > s.physical_ns {
            s.physical_ns = wall;
            s.logical = 0;
        } else {
            // Equal or regressed wall clock. Keep physical, bump logical.
            s.logical = s.logical.saturating_add(1);
        }
        *s
    }
}

impl Default for Hlc {
    fn default() -> Self {
        Self::new()
    }
}

fn wall_ns() -> u64 {
    std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .expect("clock before 1970")
        .as_nanos() as u64
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn tick_is_monotonic_across_many_calls() {
        let hlc = Hlc::new();
        let mut prev = hlc.tick();
        for _ in 0..10_000 {
            let t = hlc.tick();
            let strictly_greater = t.physical_ns > prev.physical_ns
                || (t.physical_ns == prev.physical_ns && t.logical > prev.logical);
            assert!(strictly_greater, "non-monotonic tick: {prev:?} -> {t:?}");
            prev = t;
        }
    }

    #[test]
    fn logical_increments_when_physical_equals() {
        let hlc = Hlc::new();
        // Force two ticks as fast as possible; the second will have the
        // same physical_ns (or later), and if same, logical must bump.
        let a = hlc.tick();
        let b = hlc.tick();
        if a.physical_ns == b.physical_ns {
            assert!(b.logical > a.logical);
        } else {
            assert!(b.physical_ns > a.physical_ns);
        }
    }
}
