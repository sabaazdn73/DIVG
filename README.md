# DIVG — Digital Identity + Verification Graph

**A Decentralised Verification Architecture for Impact Claims**
*Built for SUI Overflow 2026 . Based on MSc Thesis at Católica Lisbon · 2025/26*

[![Live Demo](https://img.shields.io/badge/Live%20Demo-Vercel-black?style=flat-square)](https://divg.vercel.app) [![SUI Network](https://img.shields.io/badge/Network-SUI%20Testnet-purple?style=flat-square)](https://suiscan.xyz/testnet) [![Hedera](https://img.shields.io/badge/Audit-Hedera%20HCS-green?style=flat-square)](https://hashscan.io/testnet)

---

## Overview

DIVG replaces fragmented, audit-heavy impact reporting with a decentralised verification graph anchored to two complementary distributed ledgers. The platform produces a single Verifiable Impact Credential (VIC) per claim, jointly attested by a stratified panel of stakeholders under an incentive-compatible peer-prediction mechanism — eliminating the need for repeated per-investor audits.

> *"The process happens once and is shared many times."*

The system serves three primary participants: **Firms** (e.g. MSM portfolio companies) that issue impact claims; **Validators** (stratified across employees, experts, beneficiaries) that attest claims under Compact SPP scoring; and **Investors** (e.g. LPs) that independently verify VICs through dual-path on-chain queries — without relying on the platform operator.

---

## Architecture

The verification model is deliberately decoupled across two ledgers and anchored to a thesis-grade game-theoretic mechanism:

```
[Firm] → Submits claim → SUI Move smart contract → Claim object created
                                                        ↓
                                       Stratified validator panel (VRF)
                                                        ↓
              ┌─────────────────────────────────────────┴────────────────────────────┐
              │  Stage 1 (commit):  y_i  prior belief hashed on-chain               │
              │  Stage 2 (reveal):  x_i  binary signal report after investigation   │
              │  Compact SPP:       Score_i = R_q(shadow_i, x_j) − c_i              │
              └─────────────────────────────────────────┬────────────────────────────┘
                                                        ↓
                            VIC minted unconditionally on SUI
                            ─────────────┬─────────────
                                         ↓
                    Hedera HCS audit log (every state transition)
                                         ↓
                    [Investor] → Dual-path on-chain query
```

**Dual-path verification:**
- **SUI object state** — current VIC metadata (D_final, Conf(c), S_agg)
- **Hedera HCS audit trail** — immutable history of every validation event

**Key design principle:** The VIC is minted *unconditionally* for every completed round. D_final, Conf(c), and S_agg are embedded as **metadata**, not minting gates. The platform is a non-custodial transparency layer, not a gatekeeper.

---

## Repository Structure

```
DIVG/
├── backend/              # Express server.js — orchestrates SUI + Hedera + Mesa ABM
├── frontend/             # Vite + React + TypeScript UI (App.tsx, 5-layer router)
├── sources/              # Move modules
│   ├── divg.move         # ▸ IMMUTABLE CORE: identity, claim, VIC minting
│   └── scoring.move      # ▸ UPGRADEABLE R&D: Compact SPP, confidence, σ(C)
├── tests/                # Move unit tests (22 tests, 100% scientific coverage)
│   ├── divg_tests.move
│   └── scoring_tests.move
├── scripts/
│   └── setup.sh          # Project-local one-shot installer
├── verify-standalone.js  # Standalone offline+online VIC verifier
├── example-vic.json      # Example Winnow / MSM credential
├── catalog.html          # Landing portal
├── Move.toml             # Move package configuration
├── vercel.json           # Vercel deployment config
└── package.json
```

---

## Core Components

| Component        | Technology                            | Purpose                                         |
| ---------------- | ------------------------------------- | ----------------------------------------------- |
| Smart contract   | Move (SUI Testnet, 2024 edition)      | Registry, claim, unconditional VIC minting      |
| Scoring module   | Move (upgradeable via package versioning) | Compact SPP, confidence, advisory σ(C)      |
| Audit layer      | Hedera Consensus Service              | Immutable timestamped audit trail               |
| Backend          | Node.js, Express, Hedera SDK, SUI SDK | Orchestrates round lifecycle + dual-chain calls |
| Mechanism engine | Python 3 + numpy (Mesa-derived ABM)   | Per-round Compact SPP scoring                   |
| Frontend         | React, TypeScript, Vite, Tailwind     | 5-layer architectural navigation                |
| Identity         | WaaP (Wallet-as-a-Protocol, Ika)      | Walletless onboarding via 2PC-MPC               |

---

## Mathematical Core

The mechanism implements the Compact Shadow Private-Prior Peer Prediction protocol from Witkowski &amp; Parkes (2012):

```
shadow_i  =  (1 − 2δ) · y_i  +  2δ · x_i        (δ = 0.2)
Score_i   =  R_q(shadow_i, x_j)  −  c_i         (x_j = random reference peer)
```

**Why this works (intuition).** A naïve majority vote rewards *agreement*, which creates an uninformative equilibrium: if everyone rubber-stamps "approved" without investigating, they all get paid — and impact washing slips through. Compact SPP instead rewards *predicting a randomly chosen peer's report*. Because the proper scoring rule R_q is maximised in expectation only when a validator reports the true signal it actually observed, the profitable move is to investigate and report honestly — not to follow the crowd. The `shadow` term is the Bayesian bridge: it blends a validator's private prior belief (y_i) with the signal it reveals after investigating (x_i), weighted by δ, so the score reflects how well the validator predicted the network having genuinely looked at the evidence.

Truth-telling is a strict Nash Equilibrium regardless of other validators' actions — the property that makes this mechanism appropriate when validators from heterogeneous stakeholder groups hold different subjective beliefs about the same claim.

Long-run reputation uses the Roth-Erev reinforcement learning update (Tesfatsion, 2005):

```
R_i(t+1)  =  clamp( R_i(t) + η )   if x_i = D_final
          =  clamp( R_i(t) − λ )   otherwise
```

Confidence score:

```
Conf(C)   =  α · A  +  β · Ψ  +  γ · T          (α + β + γ = 1)
```

Where A = global agreement density, Ψ = inter-group divergence penalty, T = path stability coefficient.

---

## User Roles

- **Firm** — Registers via DID (WaaP), submits claim hash on SUI, receives VIC after validation
- **Validator (Employee/Expert/Beneficiary)** — Joins pool via DID, drawn into panels by VRF, commits prior y_i, reveals signal x_i, receives Compact SPP payment
- **Investor** — Queries VIC on SUI + Hedera HCS independently, computes σ(C) against own threshold θ, makes capital deployment decision
- **Platform admin** — Holds AdminCap, registers entities, mints VICs after backend computes consensus

---

## Quick Start

### Prerequisites (system-wide — install once)

```bash
brew install node python@3.11 sui
```

### Installation (everything else is project-local)

```bash
git clone https://github.com/sabaazdn73/DIVG.git
cd DIVG

# One-shot installer — installs all deps INSIDE the project folder
bash scripts/setup.sh
```

This creates `backend/node_modules`, `backend/.venv`, `frontend/node_modules`, and `sources/build` — nothing pollutes your global Python or npm.

### Run tests (no deployment needed)

```bash
sui move test
```

22 unit tests cover the Compact SPP math, Roth-Erev reputation, unconditional VIC minting, and access control. Expected output: `Test result: OK. Total tests: 22; passed: 22; failed: 0`.

### Deploy Move package to SUI testnet

```bash
sui client switch --env testnet
sui client faucet              # get testnet SUI
sui client publish --gas-budget 100000000
```

Note the output:
- `PackageID` → `SUI_PACKAGE_ID`
- Shared `Registry` object → `SUI_REGISTRY_ID`
- `AdminCap` owned object → `SUI_ADMIN_CAP`

### Configure backend

```bash
cp backend/.env.example backend/.env
# Fill SUI_* and HEDERA_* credentials
# Hedera testnet account: https://portal.hedera.com
```

### Run dev servers

```bash
# Terminal 1 — backend
npm run dev:backend            # http://localhost:4000

# Terminal 2 — frontend
npm run dev:frontend           # http://localhost:5173
```

Open http://localhost:5173 — click **"Seed Winnow / MSM case"** on the Overview page to populate the validator pool, then run a validation round.

---

## Live Demo

**→ <https://divg.vercel.app>**

A live testnet deployment is available. From the Overview page, click any of the 5 layer cards to drill into:

1. **Identity Layer** — Register validators with DIDs; view stratified pool
2. **Claim Layer** — Submit impact claim, anchor on SUI, log to Hedera HCS
3. **Validation Layer** — Run live round with Compact SPP scoring table per validator
4. **Credential Layer** — Inspect minted VIC, view dual-path on-chain anchoring
5. **Advisory Layer** — Adjust θ, compute σ(C), see PROCEED / CAUTION output

The standalone offline VIC verifier (`verify-standalone.js`) allows fully independent, platform-free verification of any exported VIC JSON file:

```bash
npm run verify ./example-vic.json
```

---

## Mechanism Integrity

**SUI:**
The Move package demonstrates parallel execution of registry mutation, claim submission, and VIC minting as independent shared objects. The split into immutable core (`divg.move`) and upgradeable scoring (`scoring.move`) implements the **R&D principle** from the thesis: the peer-prediction rule can be replaced via package upgrade without touching identity, claim, or VIC state.

**Hedera:**
Every state transition (`entity_registered`, `claim_submitted`, `validation_round_complete`, `vic_minted`) produces a Hedera HCS message — an immutable audit trail anchored by the Hedera Governing Council. This is the same trust signal used by the Government of Maharashtra's State Carbon Bank (built on Hedera EcoGuard, 2025).

**Academia:**
The implementation operationalises the mathematical model from Chapter 3 exactly — same δ = 0.2, same τ_g = 0.5, same Roth-Erev rates η = 0.05 / λ = 0.03, same confidence weights α = β = 0.4, γ = 0.2, same unconditional VIC minting principle — making it a live, verifiable instance of the 5,000-round Mesa simulation reported in Section 3.4.

---

## Intentional Demo Tradeoffs

This MVP was built to validate the core scientific mechanism and demonstrate seamless multi-stakeholder UX across audiences (SUI Overflow, MSc thesis defence, ...). The following architectural tradeoffs were made deliberately. Each is explicitly disclosed and is resolved in the production roadmap.

| Demo Simplification | Reason | Production Resolution |
| --- | --- | --- |
| **Custodial transaction signing** — Backend holds the SUI keypair and signs all transactions on behalf of registered validators, firms, and investors | Removes wallet friction for evaluators; matches the "Web2 UX, Web3 infrastructure" goal | **WaaP (Wallet-as-a-Protocol)** via Ika's 2PC-MPC threshold signing. Each validator holds one key share, platform holds the other; transactions are co-signed without either party reconstructing the full key. Specified in Chapter 3.5.3 v of the thesis. |
| Deterministic DID generation from email hash | Speed of onboarding for demo testing | Real OAuth or email-OTP identity verification before DID issuance |
| Validator pool augmented with simulated peers when real pool < N | Demo viability without 30 real human validators per round | Real validator marketplace with DID-anchored applications; simulated path retired |
| ABM signal model approximates field investigation | Speed of demo execution | Actual claim-investigation workflows per stakeholder group, with off-chain evidence linked to the on-chain commit-reveal |
| In-memory state store in backend | Speed and simplicity | PostgreSQL (relational state) + Walrus/IPFS (claim evidence storage) |
| Backend orchestrates Hedera HCS submissions with platform credentials | Operational simplicity | Hedera SDK calls from per-validator wallets, sponsored via Hedera fee-payer accounts |

### What is *not* simplified

The **mechanism math is bit-identical to the thesis specification.** The Compact SPP scoring, Roth-Erev reputation update, unanimity rule, secondary validation cycle trigger, confidence formula, and unconditional VIC minting principle are all implemented exactly as Chapter 3 describes. This is verified by **25 Move unit tests** covering every formula in Section 3.5, including the worked Winnow / MSM example (prior y=0.75 → shadow=0.85 → Rq=0.978 → payment=0.878). Cryptographically, the demo is a custodial-MVP; **mechanistically, it is the thesis.**

### The custodial-MVP pattern

This is the same intentional tradeoff used in the author's previous IOTA-based academic recommendation system (TrustCycle, 2026). Both demos prove the **scientific contribution** (the mechanism design) while postponing the **identity-infrastructure layer** (true non-custodial keys) to the production roadmap. The two paths are functionally identical from the user's perspective; only the key custody model differs.

---

## Known Limitations & Design Boundaries

DIVG is the applied component of an MSc thesis — a **proof of concept demonstrating feasibility**, not a production-audited protocol. The following limitations are stated openly. Each reflects a deliberate scoping decision, and naming them is part of the contribution: a clear account of what a hybrid impact-verification architecture can and cannot yet do.

### 1. The oracle problem is repositioned, not solved

DIVG cannot verify that a real-world event actually happened. Like any on-chain system, it operates on the data it receives — if a firm's underlying measurement is false, the mechanism will faithfully record a falsehood with high integrity. What DIVG changes is **who attests, and under what incentives**: instead of a single self-interested auditor, a stratified panel reports under a peer-prediction rule where honest reporting is the individually rational strategy. This raises the cost and coordination required to sustain a false consensus, but it does **not** provide physical ground-truth verification. Bridging the gap between on-chain attestation and physical reality (IoT sensors, satellite data, trusted measurement oracles) is explicitly **out of scope** and identified as primary future work.

### 2. Self-attested claims are inputs, not credentials

A firm's submitted claim is **raw input awaiting verification**, not a trusted output. The architecture mints a Verifiable Impact Credential (VIC) *unconditionally* — but the VIC embeds the consensus result (`D_final`, confidence, approval ratio) as metadata, so an unverified or contested claim produces a VIC that visibly carries low confidence. The platform is a **transparency layer, not a gatekeeper**: it never asserts a claim is true, only records what the panel concluded and how strongly. Reading the unconditional VIC as an endorsement would be a misinterpretation; the confidence metadata is precisely what prevents the "greenwashing backdoor."

### 3. Sybil resistance and collusion are assumed away at the identity layer

The peer-prediction mechanism assumes validators are **independent rational agents**. In a pseudonymous setting this assumption is not free: off-chain collusion cartels or Sybil identities could coordinate to report identical signals and extract rewards without genuine investigation. DIVG **does not solve this at the mechanism layer.** The model works under the explicit assumption that *the identity (DID/SSI) layer guarantees unique, sybil-resistant identities* — stratification into employee/expert/beneficiary groups raises the coordination cost, and the agent-based simulation shows accuracy degrades gracefully up to ~33% colluding validators, but a determined cartel below that threshold is a real attack surface. Hardened anti-collusion economics (staking, slashing, randomised peer assignment with unlinkability) belong in the tokenomics design and are **out of scope for this thesis.**

### 4. The dual-ledger architecture is a research hypothesis, not a product mandate

DIVG deliberately uses **Sui for stateful object logic** (where the object-centric Move model fits the registry/claim/VIC lifecycle) and **Hedera HCS for fair-ordered, low-cost audit logging.** This is an explicit experiment in **interoperability** between a high-throughput smart-contract ledger and a dedicated consensus/ordering service for ESG applications — not a claim that every project needs two chains. A fair critique is that for a single-operator MVP, Sui's own event stream could serve the audit role, and the Node.js bridge is a centralisation point (see §5). The dual-ledger design earns its place only at scale, where Hedera's independent, council-anchored ordering provides an audit trail that does not depend on the same validators who produced the data. This is a hypothesis the thesis proposes and tests, stated as such.

### 5. The Node.js backend is a prototyping bridge — and a centralisation point

The orchestration backend that signs transactions and relays events between Sui and Hedera is a **single point of failure.** If it is compromised or offline, the cross-ledger flow stops and the Hedera audit trail can no longer be trusted as independent. This is an honest consequence of the custodial-MVP model (see *Intentional Demo Tradeoffs*) and is acceptable **only** for rapid prototyping and demonstration. The production path removes it: non-custodial WaaP signing (Ika 2PC-MPC) so the platform never holds user keys, decentralised oracles for the cross-ledger relay, and per-validator direct submission. Until then, the architecture is honestly **"Web2 orchestration over Web3 settlement,"** not fully decentralised.

### Implementation-level note: integer arithmetic in Move

The scoring functions operate in integer-scaled arithmetic (×1000) to avoid floating point, which is unavailable in Move. Two known consequences: **(a)** intermediate products such as `shadow * shadow` must be ordered and bounded to avoid `u64` overflow, and **(b)** integer division truncates, introducing small rounding losses that, in a payoff-bearing mechanism, could in principle be exploited for marginal arbitrage over many rounds. The current code constrains inputs to safe ranges and the 25 unit tests check the documented worked examples, but a **formal numerical-safety audit** (overflow proofs, fixed-point precision analysis) is required before mainnet and is listed in the roadmap.

> **Summary for evaluators:** DIVG demonstrates that an incentive-compatible, dual-ledger impact-verification architecture is *feasible* and *implementable*. It does not claim to be production-secure, sybil-proof, or to solve physical ground-truth. These boundaries are deliberate, disclosed, and form the future-work agenda.

---

## Citation

Tesfatsion, L. (2005). AGENT-BASED COMPUTATIONAL ECONOMICS: A CONSTRUCTIVE APPROACH TO ECONOMIC THEORY *.

Witkowski, J., & Parkes, D. C. (2012). Peer prediction without a common prior. Proceedings of the ACM Conference on Electronic Commerce, 964–981. https://doi.org/10.1145/2229012.2229085

```bibtex
@mastersthesis{azadegan2026divg,
  author = {Saba Azadegan},
  title  = {Digital Identity + Verification Graph (DIVG):
            A Decentralised Verification Architecture for Impact Claims
            Integrating SSI, DAO Governance, and Mechanism Design},
  school = {Católica Lisbon School of Business and Economics},
  year   = {2026},
  type   = {MSc Thesis}
}
```

Supervisor: Prof. António Miguel · Mustard Seed MAZE (MSM) Fund · Lisbon

---

## Author

**Saba Azadegan**
MSc Business · Católica Lisbon School of Business and Economics

[![LinkedIn](https://img.shields.io/badge/LinkedIn-Connect-blue?style=flat-square)](https://www.linkedin.com/in/saba-azadegan-2974b622a) [![GitHub](https://img.shields.io/badge/GitHub-Profile-black?style=flat-square)](https://github.com/sabaazdn73)

---

*Built for SUI Overflow 2026 · MSc Thesis · 2025/26*
