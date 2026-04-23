// ============================================================================
// core/obsidian-bus/examples/canonical_helper.rs
//
// Authorized by: user instruction — cross-language test harness.
//
// A tiny CLI filter: reads a hex-encoded Envelope proto on stdin, writes
// the hex-encoded canonicalize_envelope() output on stdout.
//
// Used by ad-hoc debugging during cross-language work:
//
//   echo "<hex>" | cargo run --example canonical-helper
//
// Not part of the regular test flow (tests use the committed JSON vectors
// file for reliability and reviewability).
// ============================================================================

use obsidian_bus::canonical::canonicalize_envelope;
use obsidian_bus::proto::Envelope;
use prost::Message as ProstMessage;
use std::io::{self, Read, Write};

fn main() -> io::Result<()> {
    let mut input = String::new();
    io::stdin().read_to_string(&mut input)?;
    let hex = input.trim();

    let bytes = decode_hex(hex).expect("input is not valid hex");
    let env = Envelope::decode(&*bytes).expect("input hex does not decode as Envelope proto");

    let canonical = canonicalize_envelope(&env);
    let out = encode_hex(&canonical);
    writeln!(io::stdout(), "{}", out)?;
    Ok(())
}

fn decode_hex(s: &str) -> Option<Vec<u8>> {
    if s.len() % 2 != 0 {
        return None;
    }
    let mut out = Vec::with_capacity(s.len() / 2);
    let b = s.as_bytes();
    let mut i = 0;
    while i + 1 < b.len() {
        let hi = hex_nibble(b[i])?;
        let lo = hex_nibble(b[i + 1])?;
        out.push((hi << 4) | lo);
        i += 2;
    }
    Some(out)
}

fn hex_nibble(c: u8) -> Option<u8> {
    match c {
        b'0'..=b'9' => Some(c - b'0'),
        b'a'..=b'f' => Some(c - b'a' + 10),
        b'A'..=b'F' => Some(c - b'A' + 10),
        _ => None,
    }
}

fn encode_hex(b: &[u8]) -> String {
    let mut s = String::with_capacity(b.len() * 2);
    for x in b {
        s.push_str(&format!("{:02x}", x));
    }
    s
}
