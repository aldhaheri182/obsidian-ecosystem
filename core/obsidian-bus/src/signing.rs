// ============================================================================
// core/obsidian-bus/src/signing.rs
//
// Authorized by: M0 plan §"Decisions frozen"; ADR 0003.
//
// Ed25519 signing key management for the Ecosystem.
//
// In M0, signing keys live on disk under the agent's ledger directory:
//
//   ledger-data/
//     {agent_id}/
//       signing.key   # private key (32 bytes, mode 0600)
//       signing.pub   # public key  (32 bytes, world-readable)
//
// In M3+ the private key is sealed into Vault; the public key is published
// to a PKI. For M0, on-disk is sufficient — the VM is the trust boundary,
// and `docker compose nuke` destroys all keys.
//
// We intentionally do NOT wrap `ed25519_dalek::SigningKey` in a newtype that
// blocks its methods; agents that need direct access (e.g. to build a test
// vector) can call `.inner()`. The point of this module is to:
//   - establish a canonical on-disk format,
//   - provide ergonomic `generate / load / save`,
//   - avoid spraying ed25519-dalek imports across every agent crate.
// ============================================================================

//! Ed25519 key management, signing, and verification.

use crate::error::{BusError, Result};
use ed25519_dalek::{Signer, Verifier};
use std::fs;
use std::io::Write;
use std::path::Path;

const KEY_LENGTH: usize = 32;

/// An Ed25519 signing keypair (private + derived public).
///
/// Cheap to clone (the inner key is a 32-byte seed).
#[derive(Clone)]
pub struct SigningKey(ed25519_dalek::SigningKey);

impl std::fmt::Debug for SigningKey {
    /// Redacted debug output: never print the private key bytes.
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "SigningKey(<redacted>, pubkey={})", hex_encode(self.verifying().as_bytes()))
    }
}

impl SigningKey {
    /// Generate a fresh random keypair.
    pub fn generate() -> Self {
        let mut csprng = rand::rngs::OsRng;
        SigningKey(ed25519_dalek::SigningKey::generate(&mut csprng))
    }

    /// Construct from a 32-byte seed. The seed is the Ed25519 "secret scalar
    /// generator"; the public key is deterministically derived.
    pub fn from_bytes(bytes: &[u8]) -> Result<Self> {
        if bytes.len() != KEY_LENGTH {
            return Err(BusError::MalformedKeypair(format!(
                "expected {} bytes, got {}",
                KEY_LENGTH,
                bytes.len()
            )));
        }
        let mut arr = [0u8; KEY_LENGTH];
        arr.copy_from_slice(bytes);
        Ok(SigningKey(ed25519_dalek::SigningKey::from_bytes(&arr)))
    }

    /// The 32-byte seed. Handle with care; writing this to a log is a
    /// credential leak.
    pub fn to_bytes(&self) -> [u8; KEY_LENGTH] {
        self.0.to_bytes()
    }

    /// Derive the verifying (public) half.
    pub fn verifying(&self) -> VerifyingKey {
        VerifyingKey(self.0.verifying_key())
    }

    /// Sign an arbitrary byte slice.
    pub fn sign(&self, message: &[u8]) -> Vec<u8> {
        self.0.sign(message).to_bytes().to_vec()
    }

    /// Load a keypair from disk. The file MUST be exactly 32 bytes.
    pub fn load<P: AsRef<Path>>(path: P) -> Result<Self> {
        let bytes = fs::read(path.as_ref())?;
        Self::from_bytes(&bytes)
    }

    /// Save the private key seed to disk with `0600` permissions on Unix.
    ///
    /// Safety: this writes secret material. Callers must ensure `path` is
    /// in a private directory (e.g. the agent's ledger volume).
    pub fn save<P: AsRef<Path>>(&self, path: P) -> Result<()> {
        let path = path.as_ref();
        if let Some(parent) = path.parent() {
            fs::create_dir_all(parent)?;
        }
        let mut file = fs::File::create(path)?;
        file.write_all(&self.to_bytes())?;
        file.sync_all()?;
        #[cfg(unix)]
        {
            use std::os::unix::fs::PermissionsExt;
            let mut perms = file.metadata()?.permissions();
            perms.set_mode(0o600);
            fs::set_permissions(path, perms)?;
        }
        Ok(())
    }

    /// Load an existing keypair at `path`, or generate + save one if the
    /// path does not exist. Typical first-boot flow for an agent.
    pub fn load_or_generate<P: AsRef<Path>>(path: P) -> Result<Self> {
        let path = path.as_ref();
        if path.exists() {
            Self::load(path)
        } else {
            let key = Self::generate();
            key.save(path)?;
            // Also write the companion public key next to it.
            if let Some(parent) = path.parent() {
                let pub_path = parent.join("signing.pub");
                key.verifying().save(&pub_path)?;
            }
            Ok(key)
        }
    }

    /// Access to the underlying `ed25519_dalek::SigningKey`. Prefer the
    /// methods on this wrapper; use this escape hatch only when necessary.
    pub fn inner(&self) -> &ed25519_dalek::SigningKey {
        &self.0
    }
}

/// An Ed25519 verifying (public) key.
#[derive(Clone, Debug, PartialEq, Eq, Hash)]
pub struct VerifyingKey(ed25519_dalek::VerifyingKey);

impl VerifyingKey {
    /// Construct from a 32-byte public key.
    pub fn from_bytes(bytes: &[u8]) -> Result<Self> {
        if bytes.len() != KEY_LENGTH {
            return Err(BusError::MalformedKeypair(format!(
                "expected {} pubkey bytes, got {}",
                KEY_LENGTH,
                bytes.len()
            )));
        }
        let mut arr = [0u8; KEY_LENGTH];
        arr.copy_from_slice(bytes);
        let vk = ed25519_dalek::VerifyingKey::from_bytes(&arr)
            .map_err(|e| BusError::MalformedKeypair(e.to_string()))?;
        Ok(VerifyingKey(vk))
    }

    /// The 32-byte public key.
    pub fn as_bytes(&self) -> &[u8; KEY_LENGTH] {
        self.0.as_bytes()
    }

    /// Verify that `signature` was produced by the matching `SigningKey`
    /// over `message`.
    pub fn verify(&self, message: &[u8], signature: &[u8]) -> Result<()> {
        if signature.len() != ed25519_dalek::SIGNATURE_LENGTH {
            return Err(BusError::Signing(format!(
                "expected {}-byte signature, got {}",
                ed25519_dalek::SIGNATURE_LENGTH,
                signature.len()
            )));
        }
        let mut arr = [0u8; ed25519_dalek::SIGNATURE_LENGTH];
        arr.copy_from_slice(signature);
        let sig = ed25519_dalek::Signature::from_bytes(&arr);
        self.0.verify(message, &sig).map_err(Into::into)
    }

    /// Load a public key from a 32-byte file.
    pub fn load<P: AsRef<Path>>(path: P) -> Result<Self> {
        let bytes = fs::read(path.as_ref())?;
        Self::from_bytes(&bytes)
    }

    /// Save the public key to disk. No permission restrictions — public
    /// keys are world-readable by design.
    pub fn save<P: AsRef<Path>>(&self, path: P) -> Result<()> {
        let path = path.as_ref();
        if let Some(parent) = path.parent() {
            fs::create_dir_all(parent)?;
        }
        fs::write(path, self.as_bytes())?;
        Ok(())
    }
}

// Small non-dependency hex helper used only for Debug output.
fn hex_encode(bytes: &[u8]) -> String {
    const HEX: &[u8] = b"0123456789abcdef";
    let mut s = String::with_capacity(bytes.len() * 2);
    for &b in bytes {
        s.push(HEX[(b >> 4) as usize] as char);
        s.push(HEX[(b & 0x0f) as usize] as char);
    }
    s
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::tempdir;

    #[test]
    fn sign_and_verify_round_trip() {
        let key = SigningKey::generate();
        let vk = key.verifying();
        let message = b"hello, obsidian";
        let sig = key.sign(message);
        assert!(vk.verify(message, &sig).is_ok());
    }

    #[test]
    fn verify_rejects_tampered_message() {
        let key = SigningKey::generate();
        let vk = key.verifying();
        let sig = key.sign(b"original");
        assert!(vk.verify(b"original", &sig).is_ok());
        assert!(vk.verify(b"modified", &sig).is_err());
    }

    #[test]
    fn verify_rejects_foreign_signature() {
        let key_a = SigningKey::generate();
        let key_b = SigningKey::generate();
        let sig = key_a.sign(b"payload");
        assert!(key_b.verifying().verify(b"payload", &sig).is_err());
    }

    #[test]
    fn from_bytes_roundtrip() {
        let key = SigningKey::generate();
        let bytes = key.to_bytes();
        let key2 = SigningKey::from_bytes(&bytes).unwrap();
        assert_eq!(key.verifying().as_bytes(), key2.verifying().as_bytes());
    }

    #[test]
    fn load_or_generate_creates_new_file_then_loads_same() {
        let dir = tempdir().unwrap();
        let path = dir.path().join("agent-01/signing.key");

        let k1 = SigningKey::load_or_generate(&path).unwrap();
        assert!(path.exists());
        assert!(path.parent().unwrap().join("signing.pub").exists());

        let k2 = SigningKey::load_or_generate(&path).unwrap();
        assert_eq!(k1.verifying().as_bytes(), k2.verifying().as_bytes());
    }

    #[test]
    #[cfg(unix)]
    fn saved_private_key_is_mode_0600() {
        use std::os::unix::fs::PermissionsExt;
        let dir = tempdir().unwrap();
        let path = dir.path().join("signing.key");
        SigningKey::generate().save(&path).unwrap();
        let mode = fs::metadata(&path).unwrap().permissions().mode() & 0o777;
        assert_eq!(mode, 0o600, "private key must be mode 0600");
    }

    #[test]
    fn debug_output_redacts_private_key() {
        let key = SigningKey::generate();
        let dbg = format!("{:?}", key);
        assert!(dbg.contains("redacted"));
        assert!(!dbg.contains(&hex_encode(&key.to_bytes())));
    }

    #[test]
    fn malformed_key_rejected() {
        assert!(SigningKey::from_bytes(&[0u8; 16]).is_err());
        assert!(SigningKey::from_bytes(&[0u8; 64]).is_err());
    }
}
