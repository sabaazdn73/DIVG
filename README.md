# DIVG — Decentralised Impact Verification Graph

**A verification infrastructure for impact claims.** A claim is verified **once** by a
stratified panel of stakeholders under an incentive-compatible peer-prediction mechanism,
anchored on SUI + Hedera + Walrus, and then **independently checkable many times** by any
investor — replacing the audit-heavy, per-investor PDF reporting that enables impact-washing.

> *"The process happens once and is shared many times."*

[![Live Demo](https://img.shields.io/badge/Live%20Demo-Vercel-black?style=flat-square)](https://divg.vercel.app)
[![SUI Network](https://img.shields.io/badge/Network-SUI%20Testnet-purple?style=flat-square)](https://suiscan.xyz/testnet)
[![Hedera](https://img.shields.io/badge/Audit-Hedera%20HCS-green?style=flat-square)](https://hashscan.io/testnet)

*MSc Thesis · Católica Lisbon School of Business and Economics · 2025/26 · Built for SUI Overflow 2026*
*(The thesis develops this architecture under the name "Digital Identity + Verification Graph"; the
platform and this repository use "Decentralised Impact Verification Graph" — same DIVG acronym, same system.)*

---

## What problem it solves

Impact reporting is largely self-reported and verified **separately by every investor**, which is
slow, costly, and easy to game ("impact-washing"). The thesis frames the core difficulty as two
questions: *how does an investor know a validator reported honestly?* (a peer-prediction problem)
and *how does an investor know a claim is true?* (the oracle problem — unsolvable on-chain).

DIVG does **not** claim to prove a social outcome actually happened. It produces a
**process-integrity certificate**: a cryptographically auditable record of *who* attested a claim,
*under what incentive conditions*, with *what level of cross-group agreement* — i.e. attestation
integrity, not ground truth. This honest scope is the foundational design principle of the system.

---

## Who uses it

- **Firms** (e.g. Mustard Seed MAZE portfolio companies) issue impact claims.
- **Validators** — stratified across *employees*, *experts*, and *beneficiaries* — attest claims
  under Compact SPP scoring.
- **Investors** (e.g. LPs) independently verify the credential through multiple on-chain paths,
  without trusting the platform operator.
- **Platform admin** — holds the SUI `AdminCap`; registers entities and mints VICs after the
  backend computes consensus.

Every completed round mints one **Verifiable Impact Credential (VIC)**, *unconditionally* — even
contested claims get one. The consensus result (`D_final`, `Conf(c)`, `S_agg`) is embedded as
**metadata, never a minting gate**. DIVG is a non-custodial transparency layer, not a gatekeeper.

---

## The five layers

The UI is organised as five layers (router in `frontend/src/App.tsx`), plus a live voting panel:

| # | Layer | Route | What happens |
|---|-------|-------|--------------|
| 01 | **Identity** | `/registry` | Register stakeholders with W3C DIDs on SUI. Experts/employees pass an anti-Sybil gate (web check + email OTP) before entering the stratified pool. |
| 02 | **Claim** | `/claim` | A firm submits an impact claim. It's hashed (SHA-256), anchored on SUI, logged to Hedera HCS. |
| 03 | **Validation** | `/round` | A stratified panel (default 30/30/40) is drawn; Compact SPP scores each validator. Run instantly via the Python ABM, or kick off a live DAO round. |
| 04 | **Voting Panel** | `/voting/:roundId` | The live validator dashboard — selected DIDs predict the peer signal and cast votes. |
| 05 | **Credential** | `/vic` | Inspect the minted VIC; it's pushed to **Walrus** so it survives independently of the backend. Shareable via `/vic/:id` and `/vic/walrus/:blobId`. |
| 06 | **Advisory** | `/investor` | An investor sets their own risk threshold θ and computes σ(C) → PROCEED / CAUTION. Strictly advisory; never blocks the claim. |

A guided `/walkthrough` narrates the full **Winnow / MSM** demo end to end.

---

## Architecture

```
[Firm] --submits claim--> SUI Move contract --> Claim object (SHA-256 hash on-chain)
                                                   |
                                  Stratified validator panel (default 30/30/40)
                                                   |
        Stage 1 (commit):  prior belief y_i        |
        Stage 2 (reveal):  binary signal x_i       |
        Compact SPP:       Score_i = R_q(shadow_i, x_j) - c_i   (decoupled from group consensus)
                                                   |
                          VIC minted UNCONDITIONALLY on SUI
                                                   |
              +------------------------+-----------+------------------------+
              |                        |                                    |
       SUI object state        Hedera HCS audit log                 Walrus blob
       (current metadata)      (every state transition)        (full credential record)
                                                   |
                          [Investor] --> independent verification (no trust in operator)
```

**Two ledgers, by design (not a hedge).** SUI (a third-generation, object-centric, parallel-execution
blockchain) handles programmable state — identity, claims, commit-reveal, VIC minting. Hedera
Consensus Service (a non-blockchain DLT with fair ordering and an enterprise Governing Council)
handles immutable, institutionally-credible audit logging. Walrus adds decentralised storage so the
full credential survives even if the backend is offline.

> **Hedera is optional, not required.** It is a secondary, independent audit trail. The system runs
> fully without it — VICs still mint on SUI and anchor to Walrus — and rounds simply record a
> simulated sequence when no Hedera credentials are present. SUI + Walrus are the primary trust anchors.

**Immutable core / upgradeable scoring.** The Move package splits an immutable core
(`divg.move`: identity, claim, VIC minting, HCS logging) from an upgradeable scoring module
(`scoring.move`: Compact SPP, confidence, σ(C)) — the peer-prediction rule can be swapped via
package upgrade without touching identity, claim, or VIC state. This is the thesis's on-chain "R&D
principle".

---

## Core components

| Component | Technology | Status |
|-----------|------------|--------|
| Smart contract | Move (SUI Testnet) — `sources/divg.move` | Live (testnet) |
| Scoring module | Move, upgradeable — `sources/scoring.move` | Live (testnet) |
| Audit layer | Hedera Consensus Service (`@hashgraph/sdk`) — **optional** | Live (testnet) |
| Decentralised storage | Walrus (testnet publisher/aggregator) | Live (testnet) |
| Backend | Node.js + Express (`backend/server.js`), `@mysten/sui`, `@hashgraph/sdk`, `resend` | Live |
| Mechanism engine | Python 3 stdlib (Mesa-derived ABM) | Live |
| Impact-measurement layer (optional) | IRIS+ benchmark scoring — `backend/lib/impact_scoring.js`, `frontend/src/layers/LayerAnalytics.tsx` | Live |
| Anti-Sybil gate | SerpAPI (public-record web check) + Resend (email OTP) | Live |
| Frontend | React + TypeScript + Vite + Tailwind, `react-globe.gl`, `framer-motion` | Live |
| Identity / key custody | **Custodial signing today**; **WaaP (Wallet-as-a-Protocol, Ika 2PC-MPC) on the roadmap** | See roadmap |

---

## Identity gate (anti-Sybil)

Experts and employees pass a live gate before a DID is minted (`/api/registry/initiate-verification`
+ `validateRegistration` in `server.js`):

1. **Registration rules** — one email = one identity; **firms** must register from an email on their
   **own domain** (domain must match the firm name); **employees** must affiliate to an
   **already-registered firm** and may not reuse that firm's main email; **experts** are independent
   (free-text affiliation, no firm prerequisite).
2. **Public-record web check** — SerpAPI runs name + affiliation searches two-by-two so a single
   over-specific query doesn't false-reject a real person. Soft by default; `SERP_STRICT=true` blocks
   only when every combination returns nothing. API/network errors never hard-block.
3. **Email OTP** — one server-generated 6-digit code, emailed via Resend, required to mint the DID,
   deleted after use (no replay). `DEMO_MODE=true` additionally surfaces the code on screen as a
   demo fail-safe.

> **Honest limitation.** A results-count web check filters obvious gibberish, not confident fakes; the
> real proof-of-control is the emailed OTP (which needs a verified Resend sending domain to reach
> arbitrary recipients). With `DEMO_MODE` on, the on-screen code bypasses inbox ownership — demo only.

---

## Mathematical core

Compact Shadow Private-Prior Peer Prediction (Witkowski & Parkes, 2012):

```
shadow_i = (1 − 2δ)·y_i + 2δ·x_i              (δ = 0.2)
Score_i  = R_q(shadow_i, x_j) − c_i            (x_j = random reference peer, drawn by VRF)
```

Truth-telling is a strict Nash equilibrium *regardless of what other validators do* and without a
common prior — the property that matters when employees, experts, and beneficiaries hold different
subjective beliefs about the same claim. Scoring is bilateral (vs. a random peer), so a colluding
majority cannot penalise an honest minority.

Reputation (Roth-Erev reinforcement, Tesfatsion 2005), used only as a selection filter for the
secondary cycle — never as payment:

```
R_i(t+1) = clamp(R_i(t) + η)  if x_i = D_final ;  clamp(R_i(t) − λ)  otherwise   (η=0.05, λ=0.03)
```

Confidence and advisory:

```
Conf(C) = α·A + β·Ψ + γ·T        (α=β=0.4, γ=0.2;  A=agreement, Ψ=inter-group divergence penalty, T=path stability)
σ(C)    = 1 if D_final = 1 AND Conf(c) ≥ θ  (PROCEED) ;  else 0 (CAUTION)
```

The implementation parameters match the thesis specification exactly (δ=0.2, τ_g=0.5,
η=0.05/λ=0.03, α=β=0.4/γ=0.2, default panel 30/30/40), validated across the 5,000-round Mesa
simulation in the thesis (5 experiments: baseline, collusion sweep, δ-sensitivity, composition,
reputation divergence).

---

## Worked example — Mustard Seed MAZE / Winnow (illustrative)

This example was built for the thesis (at the supervisor's request) to compare DIVG against the
traditional and Web3 alternatives on a **real portfolio relationship**.

**The relationship is real and publicly documented.** Mustard Seed (now **Mustard Seed MAZE**,
Lisbon — the first social-impact VC fund approved in Portugal) has backed **Winnow**, the
AI-driven food-waste company, across multiple rounds (co-led Winnow's Series B; co-founder Henry
Wigan is on record on the investment). Winnow operates in 70+ countries and its IKEA partnership
publicly reports ~50% food-waste reduction across 400+ stores.
Sources: hospitalitynet.org, winnowsolutions.com, compasslist.com, thecaterer.com.

**The specific figures used in the demo are illustrative, not Winnow's published results.** The demo
claim — *"47% reduction across 120 hospitality sites in Portugal & Spain, Q1 2025, ~380 t food,
~1,140 t CO₂e"* — is a constructed scenario for walkthrough purposes. It is labelled as such in the
thesis and should not be read as an audited Winnow disclosure.

**Why it matters (Impact 2.0 vs Impact 3.0):** under the traditional model, reporting Winnow's
outcomes to *five* LPs means five separate audits (≈5× cost, weeks of delay, no tamper-evident
record, no beneficiary voice). Under DIVG, one stratified validation produces a single VIC that all
five LPs verify on-chain — one verification, many verifiers — with beneficiary representatives
included as first-class validators.

---

## Real-firm onboarding (e.g. MAZE) — demo mode now, productised later

A real firm does **not** need a special code path: the standard flow already runs end-to-end. To make
that obvious to an evaluator, the app ships a **guided demo mode**:

- **Seed the real case** — "Seed Winnow / MSM example" on the Overview page populates the firm and a
  stratified validator pool (`POST /api/seed/winnow`).
- **Walk the steps** — `/walkthrough` narrates Identity → Claim → Validation → Voting → Credential →
  Advisory using that case, so MAZE (or any firm) sees exactly what their own run would look like.
- **Run it for real** — a firm registers from its own domain, submits its own claim, draws a panel, and
  receives a VIC. The only thing simplified vs. production is **key custody** (see roadmap), not the flow.

See the roadmap below for how this becomes a fully self-service, non-custodial onboarding.

---

## Quick start

```bash
# prerequisites (once)
brew install node python@3.11 sui

# install (project-local; nothing pollutes global toolchains)
git clone https://github.com/sabaazdn73/DIVG.git
cd DIVG
bash scripts/setup.sh

# contract tests (deterministic, offline)
sui move test

# publish contracts to testnet
sui client switch --env testnet
sui client faucet
sui client publish --gas-budget 100000000
#   -> record PackageID (SUI_PACKAGE_ID), shared Registry (SUI_REGISTRY_ID), AdminCap (SUI_ADMIN_CAP)

# backend config
cp backend/.env.example backend/.env     # fill SUI_*, HEDERA_*; optional SERP/RESEND/WALRUS/DEMO_MODE

# run
npm run dev:backend     # http://localhost:4000
npm run dev:frontend    # http://localhost:5173
```

Then open the frontend, click **"Seed Winnow / MSM example"** on the Overview page, and run a
validation round. For a deployed backend, set `VITE_API_BASE` to the backend **origin only** (e.g.
`https://divg-backend.onrender.com`, no trailing `/api`); leave empty to use a Vite dev proxy.

### Backend environment variables

| Variable | Purpose |
|----------|---------|
| `PORT` | Backend port (default `4000`) |
| `SUI_RPC_URL` | SUI fullnode (defaults to testnet) |
| `SUI_PACKAGE_ID`, `SUI_REGISTRY_ID`, `SUI_ADMIN_CAP` | from `sui client publish` |
| `SUI_ADMIN_PRIVATE_KEY` | admin keypair that signs Move calls (custodial-MVP) |
| `HEDERA_ACCOUNT_ID`, `HEDERA_PRIVATE_KEY`, `HEDERA_KEY_TYPE` | Hedera testnet operator |
| `HEDERA_TOPIC_ID` | optional; auto-created if absent |
| `WALRUS_PUBLISHER`, `WALRUS_AGGREGATOR` | optional; default to Walrus testnet |
| `SERP_API_KEY` | enables the public-record web check |
| `SERP_STRICT` | `true` to block when the web check finds nothing (default soft) |
| `RESEND_API_KEY`, `RESEND_FROM` | OTP email; `RESEND_FROM` must be on a verified domain |
| `DEMO_MODE` | `true` to also show the OTP on screen (off in production) |

> Anything not configured degrades into a clearly-logged simulation path (`[SUI:SIM]`, `[HCS:SIM]`,
> `[SERPAPI] Bypassing…`, `[RESEND] Skipping…`) so the demo still runs end to end.

---

## Standalone verification

```bash
npm run verify ./example-vic.json     # verifies a VIC with no backend running
```

---

## Roadmap (disclosed simplifications → production)

| Today (MVP) | Production |
|-------------|------------|
| **Custodial signing** — backend holds one SUI keypair and signs for all participants | **WaaP (Wallet-as-a-Protocol) via Ika 2PC-MPC** — each participant holds one key share, platform holds the other; transactions co-signed without either reconstructing the full key (true SSI, Web2 UX). Specified in thesis §3.5.3. |
| Deterministic DID from `sha256(name\|email)` | OAuth / email-OTP-bound DID issuance (the OTP gate is step one toward this) |
| Pool padded with simulated peers when real pool < panel size | Real validator marketplace; simulated path retired |
| ABM signal model approximates field investigation | Real claim-investigation workflows linked to the on-chain commit-reveal |
| In-memory backend state | PostgreSQL + Walrus/IPFS for evidence |
| Backend submits Hedera with platform credentials | Per-validator wallets, sponsored fee-payer accounts |
| Guided MAZE/Winnow demo mode | Fully self-service, non-custodial real-firm onboarding |

**What is *not* simplified:** the mechanism math is identical to the thesis — Compact SPP scoring,
Roth-Erev reputation, unanimity rule, secondary cycle, confidence formula, and unconditional VIC
minting. Cryptographically the demo is a custodial MVP; **mechanistically, it is the thesis.**

---

## Citation

Witkowski, J., & Parkes, D. C. (2012). *Peer prediction without a common prior.* ACM EC, 964–981.
https://doi.org/10.1145/2229012.2229085

Tesfatsion, L. (2005). *Agent-Based Computational Economics: A Constructive Approach to Economic Theory.*

Global Impact Investing Network (GIIN). *IRIS+ Catalog of Metrics (v5.1).* https://iris.thegiin.org
— used by the impact-measurement layer.

Efron, B., & Morris, C. (1975). *Data analysis using Stein's estimator and its generalizations.*
J. Amer. Statist. Assoc. — basis for the hierarchical-shrinkage benchmark.

```bibtex
@mastersthesis{azadegan2026divg,
  author = {Saba Azadegan and Omid Azadegan},
  title  = {Digital Identity + Verification Graph (DIVG): A Decentralised Verification
            Architecture for Impact Claims Integrating SSI, DAO Governance, and Mechanism Design},
  school = {Católica Lisbon School of Business and Economics},
  year   = {2026},
  type   = {MSc Thesis}
}
```

Supervisor: Prof. António Miguel · Mustard Seed MAZE (MSM) Fund · Lisbon

> **Origin.** The conceptual base draws on prior MSc impact-investing research by Saba Azadegan
> (verification & mechanism design) and Omid Azadegan (impact measurement), predating the hackathon.
> All code and implementation were built during **SUI Overflow 2026**.

---

## Authors

**Saba Azadegan** — *Lead architect & protocol engineer (contracts, backend, frontend, UI/UX).*
MSc Business, Católica Lisbon School of Business and Economics
[LinkedIn](https://www.linkedin.com/in/saba-azadegan-2974b622a) · [GitHub](https://github.com/sabaazdn73)

**Omid Azadegan** — *Impact-measurement contributor (IRIS+ benchmark scoring layer: `impact_scoring.js`,
`LayerAnalytics.tsx`, `iris_metrics.ts`).*
MSc Business, Católica Lisbon School of Business and Economics
[LinkedIn](https://www.linkedin.com/in/azadeganomid) · [GitHub](https://github.com/omidfendi)

*Built for SUI Overflow 2026 · MSc Thesis 2025/26.*