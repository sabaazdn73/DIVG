# BUILD_PROVENANCE.md

This document records **how DIVG was built, what runs for real, what is intentionally
simulated for the demo, and which third-party services and references it depends on.** It
exists so a judge, supervisor, or auditor can reproduce the build and know exactly where
the trust boundaries sit. Nothing here is hidden in the marketing copy — the goal is an
honest provenance trail.

---

## 1. Identity & ownership

| Field | Value |
|-------|-------|
| Project | DIVG — Decentralised Impact Verification Graph |
| Author | Saba Azadegan |
| Institution | Católica Lisbon School of Business and Economics |
| Context | MSc Thesis 2025/26 · SUI Overflow 2026 |
| Repository | https://github.com/sabaazdn73/DIVG |
| Live deployment | Frontend: https://divg.vercel.app · Backend: Render |
| License | See repository |

---

## 2. Languages & components (as built)

Per the repository's language breakdown and source tree:

| Layer | Language / runtime | Source |
|-------|-------------------|--------|
| Smart contracts | Move (SUI Testnet, 2024 edition) | `sources/divg.move`, `sources/scoring.move` |
| Backend orchestration | Node.js + Express (ESM) | `backend/server.js` |
| Mechanism engine | Python 3 + numpy (Mesa-derived ABM) | `backend/abm_round.py` |
| Frontend | TypeScript + React + Vite + Tailwind | `frontend/src/**` |
| Landing portal | HTML | `catalog.html` |
| Tooling | Shell | `scripts/setup.sh` |
| Standalone verifier | JavaScript | `verify-standalone.js` |

---

## 3. Build & reproduction steps

The build is **project-local** — `scripts/setup.sh` installs all dependencies inside the
repo (`backend/node_modules`, `backend/.venv`, `frontend/node_modules`, `sources/build`)
rather than polluting global toolchains.

```bash
# 0. system tools (once)
brew install node python@3.11 sui

# 1. clone + install
git clone https://github.com/sabaazdn73/DIVG.git
cd DIVG
bash scripts/setup.sh

# 2. contract tests (deterministic, no network)
sui move test

# 3. publish contracts to testnet
sui client switch --env testnet
sui client faucet
sui client publish --gas-budget 100000000
#   -> record PackageID, Registry (shared), AdminCap

# 4. backend config
cp backend/.env.example backend/.env       # fill SUI_*, HEDERA_*, optional SERP/RESEND/WALRUS

# 5. run
npm run dev:backend    # :4000
npm run dev:frontend   # :5173
```

**Determinism notes**

- Move unit tests are fully deterministic and offline.
- The Python ABM seeds randomness per round; given the same panel + ground truth it
  reproduces the same Compact SPP scores.
- DIDs are derived deterministically: `did:divg:` + first 16 hex of
  `sha256(full_name|email)`; the SUI address is `0x` + `sha256(did)`.

---

## 4. Trust boundary — what is REAL vs SIMULATED

This is the most important section. DIVG is, by design, a **custodial MVP with a
bit-accurate mechanism**: the *science* is real, the *key custody* is simplified for the
demo. The backend logs make the active path explicit at runtime.

### Real (when credentials are configured)

- **SUI Move contracts** — identity registration, claim submission, and unconditional VIC
  minting execute as real Move calls against SUI Testnet, signed by the admin keypair
  (`SUI_ADMIN_PRIVATE_KEY`). Returns real transaction digests, verifiable on Suiscan.
- **Hedera HCS** — every state transition (`entity_registered`, `claim_submitted`,
  `validation_round_complete`) is submitted as a real HCS message; returns a real topic
  sequence number, verifiable on HashScan.
- **Walrus** — completed VICs are PUT to the Walrus testnet publisher and retrievable from
  the aggregator via blob id, independent of the backend.
- **Compact SPP scoring** — computed by the Python ABM exactly as specified (see §6).
- **Identity gate** — SerpAPI web search and Resend email dispatch are real API calls when
  keys are present.

### Simulated / custodial (intentional demo tradeoffs)

| Simplification | Why | Production resolution |
|----------------|-----|----------------------|
| **Custodial signing** — backend holds one SUI keypair and signs for all participants | Removes wallet friction for evaluators (Web2 UX) | WaaP / Ika 2PC-MPC threshold signing — each party holds a key share |
| Deterministic DID from `sha256(name\|email)` | Fast onboarding for testing | Real OAuth / email-OTP-bound DID issuance (the OTP gate is the first step toward this) |
| Validator pool padded with simulated peers when real pool < panel size | Demo viable without 30 live humans per round | Real validator marketplace; simulated path retired |
| ABM signal model approximates field investigation | Demo speed | Real claim-investigation workflows linked to the commit–reveal |
| In-memory state in the backend (`STATE` object) | Simplicity | PostgreSQL + Walrus/IPFS for evidence |
| Backend submits Hedera with platform credentials | Operational simplicity | Per-validator wallets with sponsored fee-payer accounts |

### Graceful-degradation markers (runtime log prefixes)

When a credential is absent the code drops to a clearly-labelled simulation path rather
than failing silently:

- `[SUI:SIM] would call …` — no admin key / package id → simulated digest
- `[HCS:SIM] … seq=…` — no Hedera creds → simulated sequence
- `[SERPAPI] Bypassing real web check for demo.` — no `SERP_API_KEY`
- `[RESEND] Skipping real email dispatch.` — no `RESEND_API_KEY`
- `[WALRUS] store error/failed` — publisher unreachable → VIC still minted, no blob id

---

## 5. Identity-gate provenance (anti-Sybil)

The gate in `backend/server.js` (`/api/registry/initiate-verification` + `validateRegistration`)
enforces, in order:

1. **Registration rules** — one email = one identity; firms must use their own-domain email;
   employees must attach to a registered firm and not reuse its main email; experts are
   independent.
2. **SerpAPI web check** — name + affiliation searched two-by-two; passes if any pair returns
   public records. Soft by default; `SERP_STRICT=true` blocks only when every pair returns
   nothing. API/network errors never hard-block (logged as "could not verify").
3. **Email OTP** — one server-generated 6-digit code, stored in `STATE.pendingVerifications`,
   emailed via Resend, and required at `/api/registry/register`. Deleted on successful use
   (no replay). `DEMO_MODE=true` additionally returns the code to the UI as a fail-safe.

**Known limitations (disclosed):** a results-count web check filters obvious gibberish but
not confident fabrications; the real proof-of-control is the emailed OTP, which requires a
verified Resend sending domain to deliver to arbitrary recipients. With `DEMO_MODE` on, the
on-screen code bypasses inbox ownership — demo only.

---

## 6. Mechanism provenance (what is NOT simplified)

The mechanism math is **bit-identical to the thesis specification** and covered by Move unit
tests in `tests/`:

| Parameter | Value | Meaning |
|-----------|-------|---------|
| δ | 0.2 | shadow-belief mixing |
| τ_g | 0.5 | group threshold |
| η / λ | 0.05 / 0.03 | Roth-Erev reinforcement up / down |
| α, β, γ | 0.4, 0.4, 0.2 | confidence weights (sum = 1) |
| Panel stratification | 30 / 30 / 40 | employee / expert / beneficiary |

Worked Winnow / MSM example (reproduced by tests): prior y = 0.75 → shadow = 0.85 →
R_q = 0.978 → payment = 0.878. VIC minting is unconditional in both the contract and tests.

> Cryptographically, the demo is a custodial MVP. **Mechanistically, it is the thesis.**

---

## 7. Third-party dependencies & references

**Runtime services:** SUI Testnet (RPC + Move), Hedera Consensus Service, Walrus testnet
(publisher/aggregator), SerpAPI (Google search), Resend (transactional email),
Vercel (frontend hosting), Render (backend hosting).

**Key libraries:** `@mysten/sui`, `@hashgraph/sdk`, `resend`, `express`, `axios`,
`react`, `react-router-dom`, `react-globe.gl`, `framer-motion`, `lucide-react`, `numpy`.

**Academic references:**
- Witkowski & Parkes (2012), *Peer prediction without a common prior*, ACM EC — Compact SPP.
- Tesfatsion (2005), *Agent-Based Computational Economics* — Roth-Erev reinforcement.

**Reused author asset:** the custodial-MVP pattern and `SignatureGlobe` visual mark are
carried over from the author's earlier IOTA-based project (TrustCycle, 2026) and reused here
as a recognisable signature element.

---

## 8. Verification checklist for reviewers

- [ ] `sui move test` passes (mechanism math + access control).
- [ ] `sui client publish` yields a PackageID; registering an entity returns a real SUI digest.
- [ ] A validation round returns a Hedera topic sequence (HashScan) and a Walrus blob id.
- [ ] `npm run verify ./example-vic.json` validates a credential with no backend running.
- [ ] Backend logs show real vs `:SIM` paths matching which credentials are configured.

---

*Provenance maintained by Saba Azadegan. This document is intended to be updated alongside
the production roadmap as each simulated path is replaced by its non-custodial equivalent.*
