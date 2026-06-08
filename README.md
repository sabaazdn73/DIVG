# DIVG — Decentralised Impact Verification Graph

**A verification infrastructure for impact claims.** One claim is verified once by a
stratified panel under an incentive-compatible peer-prediction mechanism, anchored on
SUI + Hedera + Walrus, and then independently checkable by any investor — replacing the
audit-heavy, per-investor PDF reporting that enables impact-washing.

> *"The process happens once and is shared many times."*

[Live demo](https://divg.vercel.app) · SUI Testnet · Hedera HCS · Walrus
Built for **SUI Overflow 2026** · MSc Thesis, Católica Lisbon · 2025/26

---

## What it does

DIVG serves three participants:

- **Firms** (e.g. Mustard Seed MAZE portfolio companies) issue impact claims.
- **Validators** — stratified across *employees*, *experts*, and *beneficiaries* — attest
  claims under Compact SPP scoring.
- **Investors** (e.g. LPs) independently verify the resulting credential through three
  on-chain paths, without trusting the platform operator.

Every completed round produces one **Verifiable Impact Credential (VIC)**, minted
*unconditionally* — even contested claims get one. The consensus result (`D_final`,
`Conf(c)`, `S_agg`) is embedded as **metadata, never a minting gate**. DIVG is a
non-custodial transparency layer, not a gatekeeper.

---

## The five layers

The UI is organised as five layers (the router in `frontend/src/App.tsx`), plus a live
voting panel:

| # | Layer | Route | What happens |
|---|-------|-------|--------------|
| 01 | **Identity** | `/registry` | Register stakeholders with W3C DIDs on SUI. Experts/employees pass an anti-Sybil gate (web check + email OTP) before entering the stratified pool. |
| 02 | **Claim** | `/claim` | A firm submits an impact claim. It's hashed (SHA-256), anchored on SUI, logged to Hedera HCS. |
| 03 | **Validation** | `/round` | A stratified panel (30/30/40) is drawn; Compact SPP scores each validator. Run instantly via the Python ABM, or kick off a live DAO round. |
| 04 | **Voting Panel** | `/voting/:roundId` | The live validator dashboard — selected DIDs predict the peer signal and cast votes. |
| 05 | **Credential** | `/vic` | Inspect the minted VIC; it's pushed to **Walrus** so it survives independently of the backend. Shareable via `/vic/:id` and `/vic/walrus/:blobId`. |
| 06 | **Advisory** | `/investor` | An investor sets their own risk threshold θ and computes σ(C) → PROCEED / CAUTION. Strictly advisory; never blocks the claim. |

A guided `/walkthrough` narrates the full Winnow / MSM demo end to end.

---

## Architecture

```
[Firm] --submits claim--> SUI Move contract --> Claim object (SHA-256 hash on-chain)
                                                   |
                                  Stratified validator panel (30/30/40)
                                                   |
        Stage 1 (commit):  prior belief y_i        |
        Stage 2 (reveal):  binary signal x_i       |
        Compact SPP:       Score_i = R_q(shadow_i, x_j) - c_i
                                                   |
                          VIC minted UNCONDITIONALLY on SUI
                                                   |
              +------------------------+-----------+------------------------+
              |                        |                                    |
       SUI object state        Hedera HCS audit log                 Walrus blob
       (current metadata)      (every state transition)        (full credential record)
                                                   |
                          [Investor] --> independent dual/triple-path verification
```

**Three independent verification paths for a VIC:**

1. **SUI object** — current credential state (`D_final`, `Conf(c)`, `S_agg`).
2. **Hedera HCS** — immutable, timestamped history of every validation event.
3. **Walrus** — the full credential record, retrievable even if the backend is offline.

---

## Tech stack

| Component | Technology |
|-----------|------------|
| Smart contracts | Move — SUI Testnet (`sources/divg.move`, `sources/scoring.move`) |
| Audit layer | Hedera Consensus Service (`@hashgraph/sdk`) |
| Decentralised storage | Walrus (testnet publisher / aggregator) |
| Backend | Node.js + Express (`backend/server.js`), `@mysten/sui`, `@hashgraph/sdk`, `resend` |
| Mechanism engine | Python 3 + numpy (Mesa-derived ABM, `backend/abm_round.py`) |
| Anti-Sybil gate | SerpAPI (public-record web check) + Resend (email OTP) |
| Frontend | React + TypeScript + Vite + Tailwind, `react-globe.gl`, `framer-motion` |

The Move package is intentionally split into an **immutable core** (`divg.move`: identity,
claim, VIC minting) and an **upgradeable scoring module** (`scoring.move`: Compact SPP,
confidence, σ(C)) — the peer-prediction rule can be swapped via package upgrade without
touching identity, claim, or VIC state.

---

## Repository structure

```
DIVG/
├── backend/              # Express server.js — orchestrates SUI + Hedera + Walrus + Python ABM
│   ├── server.js
│   ├── abm_round.py
│   └── .env.example
├── frontend/             # Vite + React + TS UI (App.tsx → 5-layer router + voting panel)
│   └── src/
│       ├── App.tsx, main.tsx
│       ├── layers/       # LayerOverview / Registry / Claim / Round / ValidatorPanel / VIC / Investor / Walkthrough
│       ├── components/   # DIVGScene, VICertificate, LayerGuide, SignatureGlobe
│       └── lib/api.ts    # typed API client
├── sources/              # Move modules
│   ├── divg.move         # immutable core
│   └── scoring.move      # upgradeable R&D
├── tests/                # Move unit tests
├── scripts/setup.sh      # project-local one-shot installer
├── verify-standalone.js  # offline + online VIC verifier
├── example-vic.json
├── Move.toml
└── vercel.json
```

---

## Quick start

### Prerequisites (install once)

```bash
brew install node python@3.11 sui
```

### Install (everything else is project-local)

```bash
git clone https://github.com/sabaazdn73/DIVG.git
cd DIVG
bash scripts/setup.sh      # creates backend/node_modules, backend/.venv, frontend/node_modules, sources/build
```

### Run Move tests (no deployment needed)

```bash
sui move test
```

### Deploy the Move package to SUI testnet

```bash
sui client switch --env testnet
sui client faucet
sui client publish --gas-budget 100000000
```

Record from the output: `PackageID → SUI_PACKAGE_ID`, the shared `Registry` object →
`SUI_REGISTRY_ID`, and the `AdminCap` → `SUI_ADMIN_CAP`.

### Configure the backend

```bash
cp backend/.env.example backend/.env
```

| Variable | Purpose |
|----------|---------|
| `PORT` | Backend port (default `4000`) |
| `SUI_RPC_URL` | SUI fullnode (defaults to testnet) |
| `SUI_PACKAGE_ID`, `SUI_REGISTRY_ID`, `SUI_ADMIN_CAP` | from `sui client publish` |
| `SUI_ADMIN_PRIVATE_KEY` | admin keypair used to sign Move calls |
| `HEDERA_ACCOUNT_ID`, `HEDERA_PRIVATE_KEY`, `HEDERA_KEY_TYPE` | Hedera testnet operator ([portal.hedera.com](https://portal.hedera.com)) |
| `HEDERA_TOPIC_ID` | optional; auto-created if absent |
| `WALRUS_PUBLISHER`, `WALRUS_AGGREGATOR` | optional; default to Walrus testnet endpoints |
| `SERP_API_KEY` | enables the public-record web check on the identity gate |
| `SERP_STRICT` | `true` to *block* registration when the web check finds nothing (default soft) |
| `RESEND_API_KEY`, `RESEND_FROM` | sends the OTP email (`RESEND_FROM` must be on a verified domain) |
| `DEMO_MODE` | `true` to also surface the OTP on screen as a fail-safe (off in production) |

> Anything not configured degrades gracefully into a clearly-logged simulation path
> (`[SUI:SIM]`, `[HCS:SIM]`, `[SERPAPI] Bypassing…`, `[RESEND] Skipping…`) so the demo
> still runs end to end.

### Run the dev servers

```bash
npm run dev:backend     # http://localhost:4000
npm run dev:frontend    # http://localhost:5173
```

Open the frontend, click **"Seed Winnow / MSM example"** on the Overview page to populate
the validator pool, then run a validation round.

For the frontend to reach a deployed backend, set `VITE_API_BASE` to the backend **origin
only** (e.g. `https://divg-backend.onrender.com`, no trailing `/api`); leave empty to use
a Vite dev proxy for `/api`.

---

## Identity gate (anti-Sybil)

Experts and employees pass a live gate before a DID is minted:

1. **Public-record web check** — SerpAPI runs name + affiliation searches (tried two-by-two
   so a single over-specific query doesn't false-reject). Soft by default; `SERP_STRICT=true`
   blocks only when every combination returns nothing.
2. **Email OTP** — a single server-generated code is emailed via Resend and verified before
   the DID is issued. (In `DEMO_MODE`, the code is also shown on screen as a fail-safe.)
3. **Registration rules** (`validateRegistration` in `server.js`):
   - **One email = one identity** across firms, validators, and investors.
   - **Firms** must register from an email on their **own domain** (the domain must match
     the firm name).
   - **Employees** must affiliate to an **already-registered firm** and may **not** reuse
     that firm's main email.
   - **Experts** are independent — free-text affiliation, no firm prerequisite — but still
     pass the OTP gate and the one-email rule.

---

## Mathematical core

Compact Shadow Private-Prior Peer Prediction (Witkowski & Parkes, 2012):

```
shadow_i  =  (1 − 2δ)·y_i  +  2δ·x_i           (δ = 0.2)
Score_i   =  R_q(shadow_i, x_j)  −  c_i          (x_j = random reference peer)
```

Truth-telling is a strict Nash equilibrium regardless of other validators' actions — the
property that matters when heterogeneous stakeholder groups hold different subjective
beliefs about the same claim.

Reputation (Roth-Erev reinforcement, Tesfatsion 2005):

```
R_i(t+1) = clamp( R_i(t) + η )   if x_i = D_final
         = clamp( R_i(t) − λ )   otherwise
```

Confidence:

```
Conf(C) = α·A + β·Ψ + γ·T          (α + β + γ = 1)
```

where A = global agreement density, Ψ = inter-group divergence penalty, T = path stability.

Investor advisory:

```
σ(C) = 1  if  D_final = 1  AND  Conf(c) ≥ θ      (PROCEED)
σ(C) = 0  otherwise                              (CAUTION)
```

---

## Standalone verification

Any exported VIC can be verified with no platform dependency:

```bash
npm run verify ./example-vic.json
```

---

## Citation

Witkowski, J., & Parkes, D. C. (2012). *Peer prediction without a common prior.*
Proceedings of the ACM Conference on Electronic Commerce, 964–981.
https://doi.org/10.1145/2229012.2229085

Tesfatsion, L. (2005). *Agent-Based Computational Economics: A Constructive Approach to
Economic Theory.*

```bibtex
@mastersthesis{azadegan2026divg,
  author = {Saba Azadegan},
  title  = {Decentralised Impact Verification Graph (DIVG):
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

**Saba Azadegan** — MSc Business, Católica Lisbon School of Business and Economics
[LinkedIn](https://www.linkedin.com/in/saba-azadegan-2974b622a) · [GitHub](https://github.com/sabaazdn73)

*Built for SUI Overflow 2026 · MSc Thesis 2025/26 · Based on the thesis "Impact-Washing Solution".*
