# Security Notes — Quorum Protocol
# Audit Reference Document

## Pre-Audit Status

| Check | Result |
|-------|--------|
| cargo clippy | 0 warnings |
| cargo audit | 7 findings (all inherited, see below) |
| anchor build | Clean — 0 errors |
| Test coverage | 30/30 bankrun tests passing |
| Instructions covered | 12/12 |

---

## Cargo Audit Findings

All 7 findings below are inherited from 
transitive dependencies of Anchor 0.31 / 
Solana SDK 2.1.x. None originate from 
Quorum's own code. Resolution requires an 
ecosystem-level update from Anchor/Solana 
SDK maintainers and is outside the scope 
of this project.

### 1. RUSTSEC-2024-0344
- **Crate:** curve25519-dalek 3.2.0
- **Type:** Vulnerability — timing side-channel
  in Scalar29::sub / Scalar52::sub
- **Dependency path:** anchor-spl 0.31.1 →
  spl-token-2022 6.0.0 → solana-sdk 2.1.16 →
  ed25519-dalek-bip32 0.2.0 →
  curve25519-dalek 3.2.0
- **Fix available:** >=4.1.3, but requires
  full Anchor/Solana SDK upgrade — not
  currently feasible without breaking changes
- **Risk in Solana context:** Low. Timing
  attacks require attacker control of the
  computation environment. Solana validators
  execute programs in an isolated sBPF VM;
  this attack vector does not apply.
- **Status:** Accepted inherited ecosystem
  risk. Monitored for upstream resolution.

### 2. RUSTSEC-2022-0093
- **Crate:** ed25519-dalek 1.0.1
- **Type:** Vulnerability — double public key
  signing oracle attack
- **Dependency path:** Same as above via
  ed25519-dalek-bip32 0.2.0
- **Fix available:** >=2.0, blocked by same
  dependency chain
- **Risk in Solana context:** Low. The attack
  requires a co-located signing oracle with
  access to both keypairs simultaneously.
  This does not apply to the Quorum program's
  execution model — Quorum does not perform
  ed25519 signing operations directly.
- **Status:** Accepted inherited ecosystem
  risk. Monitored for upstream resolution.

### 3. RUSTSEC-2025-0141
- **Crate:** bincode 1.3.3
- **Type:** Warning — unmaintained crate
- **Dependency path:** Anchor framework
  internal serialization
- **Fix available:** No drop-in replacement
  available at this dependency level
- **Status:** Accepted inherited risk.

### 4. RUSTSEC-2024-0388
- **Crate:** derivative 2.2.0
- **Type:** Warning — unmaintained crate
- **Dependency path:** Anchor proc-macros
- **Fix available:** None
- **Status:** Accepted inherited risk.

### 5. RUSTSEC-2025-0161
- **Crate:** libsecp256k1 0.6.0
- **Type:** Warning — unmaintained crate
- **Dependency path:** Solana SDK internals
- **Fix available:** None
- **Status:** Accepted inherited risk.

### 6. RUSTSEC-2024-0436
- **Crate:** paste 1.0.15
- **Type:** Warning — unmaintained crate
- **Dependency path:** Anchor proc-macros
- **Fix available:** None
- **Status:** Accepted inherited risk.

### 7. RUSTSEC-2026-0097
- **Crate:** rand 0.7.3
- **Type:** Warning — unsound
- **Dependency path:** Solana SDK internals
- **Fix available:** None at this dependency
  level without breaking the SDK
- **Status:** Accepted inherited risk.

---

## Notes for Auditors

These findings appear in virtually all 
programs built on Anchor 0.31 / Solana SDK 
2.1.x. They represent ecosystem-level 
technical debt that requires coordinated 
resolution from the Anchor and Solana Labs 
teams, not individual projects.

The Quorum team ran cargo audit prior to 
engaging this audit firm, identified all 
findings proactively, assessed each one in 
the context of Solana's execution model, 
and documented them here for full 
transparency.

The Quorum team will update affected 
dependencies as upstream patches become 
available, and will commission a re-audit 
of any changed components before mainnet 
deployment if such updates introduce 
meaningful code changes.

---

## Program Information

| Field | Value |
|-------|-------|
| Program ID (devnet) | DVxHFqsi2zgxvMLGjmtEBBPJ8o4dFBVWtdSHt77sMMrk |
| Platform PDA | 9KV2dLKNyiXvEaawpeAKkp1jCFaUYGtehcnPzdk4nvyj |
| Framework | Anchor 0.31.0 / Rust |
| Network | Solana Devnet (mainnet pending audit) |
| GitHub | github.com/rogradev/quorum-mvp |
| Landing | quorumbuild.xyz |
