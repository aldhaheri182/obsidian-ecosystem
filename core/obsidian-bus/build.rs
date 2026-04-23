// ============================================================================
// core/obsidian-bus/build.rs
//
// Authorized by: M0 plan §"Build order" step 2; spec Part 4.2.
//
// Compiles the Protobuf schemas in /proto into Rust types via prost-build.
// The generated module lives in $OUT_DIR/obsidian.rs and is `include!`'d
// from src/lib.rs under `pub mod proto`.
//
// Any new .proto file in the /proto directory MUST be added to PROTO_FILES
// below, otherwise the corresponding Rust types will not be generated.
// ============================================================================

use std::path::PathBuf;

const PROTO_ROOT: &str = "../../proto";

const PROTO_FILES: &[&str] = &[
    "envelope.proto",
    "market_data.proto",
    "signal.proto",
    "order.proto",
    "risk.proto",
    "heartbeat.proto",
];

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let proto_root = PathBuf::from(PROTO_ROOT);

    // Rerun if any .proto or this build script changes.
    println!("cargo:rerun-if-changed=build.rs");
    for f in PROTO_FILES {
        println!("cargo:rerun-if-changed={}/{}", PROTO_ROOT, f);
    }

    let files: Vec<PathBuf> = PROTO_FILES.iter().map(|f| proto_root.join(f)).collect();

    // Sanity check at build time: missing .proto file produces a legible error
    // instead of a cryptic prost failure.
    for f in &files {
        if !f.exists() {
            return Err(format!("proto file not found: {}", f.display()).into());
        }
    }

    prost_build::Config::new()
        // Use BTreeMap for maps so serialization is deterministic (future-proofing;
        // no map fields exist in M0, but this guarantees the behaviour if any are
        // added).
        .btree_map(["."])
        .compile_protos(&files, &[&proto_root])?;

    Ok(())
}
