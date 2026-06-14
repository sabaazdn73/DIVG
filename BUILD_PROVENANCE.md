# BUILD_PROVENANCE.md

This document records **how DIVG was built, what runs for real, what is intentionally simulated for
the demo, and which third-party services and references it depends on** — so a judge, supervisor, or
auditor can reproduce the build and see exactly where the trust boundaries sit. The guiding rule is
**no overclaiming**: where the demo simplifies, it says so.

---

## 1. Identity & ownership

| Field | Value |
|-------|-------|
| Project | DIVG — Decentralised Impact Verification Graph |
| Thesis name | "Digital Identity + Verification Graph" (same acronym/system; the platform uses "Decentralised Impact Verification Graph") |
| Lead author & protocol engineer | Saba Azadegan |
| Impact-measurement contributor | Omid Azadegan |
| Institution | Católica Lisbon School of Business and Economics |
| Supervisor | Prof. António Miguel (Mustard Seed MAZE) |
| Context | MSc Thesis 2025/26 · SUI Overflow 2026 |
| Repository | https://github.com/sabaazdn73/DIVG |
| Live deployment | Frontend: https://divg.vercel.app · Backend: Render |

> **Origin of the work.** The conceptual base comes from prior MSc thesis research in impact
> investing by Saba Azadegan (decentralised verification & mechanism design) and Omid Azadegan
> (outcome-based impact measurement), which predates the hackathon. The **entire code,
> implementation, smart contracts, and deployment** were built during **SUI Overflow 2026** — the
> research framed the problem; the running system here is hackathon work.

### Design philosophy (why decentralisation)

The system's organising principle is **decentralisation as a redistribution of trust-making power**.
Impact verification is currently gatekept by centralised intermediaries (auditors, rating agencies)
that can be captured, can extract rent, and form single points of failure. DIVG's structural claim is
not that a crowd is more honest than an auditor, but that the architecture removes the need to trust
*any single actor*: a stratified stakeholder network attests under an incentive-compatible
peer-prediction mechanism, and evidence, votes, and results live on decentralised infrastructure (SUI
+ Walrus) so anyone can re-audit independently. Returning verification agency to a system's
participants rather than its intermediaries is the same motivation behind decentralised settlement
generally — stated here as a structural, not moral or political, argument.

---

## 2. Languages & components (as built)

| Layer | Language / runtime | Source | Owner |
|-------|-------------------|--------|-------|
| Smart contracts | Move (SUI Testnet) | `sources/divg.move`, `sources/scoring.move` | Saba |
| Backend orchestration | Node.js + Express (ESM) | `backend/server.js` | Saba |
| Mechanism engine | Python 3 stdlib (Mesa-derived ABM) | `backend/abm_round.py` | Saba |
| Frontend & UI/UX | TypeScript + React + Vite + Tailwind | `frontend/src/**` | Saba |
| Impact-measurement layer (optional) | Node.js + TypeScript | `backend/lib/impact_scoring.js`, `frontend/src/layers/LayerAnalytics.tsx`, `frontend/src/lib/iris_metrics.ts` | Omid |
| Landing portal | HTML | `catalog.html` | Saba |
| Tooling | Shell | `scripts/setup.sh` | Saba |
| Standalone verifier | JavaScript | `verify-standalone.js` | Saba |

---

## 3. Build & reproduction

The build is **project-local** — `scripts/setup.sh` installs dependencies inside the repo
(`backend/node_modules`, `backend/.venv`, `frontend/node_modules`, `sources/build`).

```bash
brew install node python@3.11 sui                 # 0. system tools (once)
git clone https://github.com/sabaazdn73/DIVG.git  # 1. clone + install
cd DIVG && bash scripts/setup.sh
sui move test                                      # 2. contract tests (deterministic, offline)
sui client switch --env testnet                    # 3. publish
sui client faucet
sui client publish --gas-budget 100000000          #    -> PackageID, Registry, AdminCap
cp backend/.env.example backend/.env               # 4. config
npm run dev:backend                                # 5. run (:4000)
npm run dev:frontend                               #         (:5173)
```

**Determinism notes**
- Move unit tests are deterministic and offline.
- The Python ABM seeds randomness per round; same panel + ground truth ⇒ same Compact SPP scores.
- DIDs are derived deterministically: `did:divg:` + first 16 hex of `sha256(full_name|email)`;
  the SUI address is `0x` + `sha256(did)`.

---

## 4. Trust boundary — REAL vs SIMULATED (the core honesty statement)

DIVG is, by design, a **custodial MVP with a thesis-accurate mechanism**: the *science* is real, the
*key custody* is simplified for the demo. The backend logs make the active path explicit at runtime.

### Real (when credentials are configured)
- **SUI Move contracts** — identity registration, claim submission, unconditional VIC minting run as
  real Move calls signed by the admin keypair (`SUI_ADMIN_PRIVATE_KEY`); real digests on Suiscan.
- **Hedera HCS (optional)** — when configured, every state transition (`entity_registered`,
  `claim_submitted`, `validation_round_complete`) is a real HCS message with a real sequence number on
  HashScan. **Hedera is not required**: it is a secondary, independent audit trail. With no Hedera
  credentials the system runs fully — VICs still mint on SUI and anchor to Walrus — and the round
  simply records a simulated sequence (`[HCS:SIM]`). SUI + Walrus are the primary trust anchors.
- **Walrus** — completed VICs are PUT to the Walrus testnet publisher and retrievable by blob id,
  independent of the backend.
- **Compact SPP scoring** — computed by the Python ABM exactly as specified (see §6).
- **Identity gate** — SerpAPI search and Resend email dispatch are real API calls when keys are set.
- **AI agent & site assistant (optional)** — when `GEMINI_API_KEY` is set, the benchmarking agent and
  the landing-page assistant call Google Gemini (`gemini-3.1-flash-lite`). The agent answers strictly
  from the scorecard (read from Walrus when a blob id is present); the assistant answers general
  questions about DIVG. With no key, both return a deterministic offline summary — never a hard failure.
  The LLM is an explanatory aid only; it never affects scoring, validation, or VIC minting.

### Simulated / custodial (intentional, disclosed)

| Simplification | Why | Production resolution |
|----------------|-----|----------------------|
| **Custodial signing** — backend holds one SUI keypair, signs for all participants | Removes wallet friction for evaluators (Web2 UX) | **WaaP / Ika 2PC-MPC** threshold signing — each party holds a key share (thesis §3.5.3) |
| Deterministic DID from `sha256(name\|email)` | Fast onboarding for testing | Real OAuth / email-OTP-bound DID issuance |
| Validator pool padded with simulated peers when real pool < panel size | Demo viable without enough live humans | Real validator marketplace; simulated path retired |
| **Demo voting UX** — one operator can cast each panel member's single vote in turn from one screen | Lets evaluators exercise the full round without N devices | Each validator signs in independently, sees only their own DID, casts one vote |
| ABM signal model approximates field investigation | Demo speed | Real claim-investigation workflows linked to commit-reveal |
| In-memory backend state (`STATE` object) | Simplicity | PostgreSQL for metadata (evidence already on Walrus) |
| Backend submits Hedera with platform credentials | Operational simplicity | Per-validator wallets, sponsored fee-payer accounts |

### Graceful-degradation markers (runtime log prefixes)
- `[SUI:SIM] would call …` — no admin key / package id → simulated digest
- `[HCS:SIM] … seq=…` — no Hedera creds → simulated sequence
- `[SERPAPI] Bypassing real web check for demo.` — no `SERP_API_KEY`
- `[RESEND] Skipping real email dispatch.` — no `RESEND_API_KEY`
- `[WALRUS] store error/failed` — publisher unreachable → VIC still minted, no blob id

> **The custodial-MVP pattern** mirrors the author's earlier IOTA-based project (TrustCycle, 2026):
> prove the *scientific contribution* (mechanism design) now, defer the *identity-infrastructure layer*
> (non-custodial keys) to the roadmap. From the user's perspective and on-chain mechanism logic the
> two paths are functionally identical; only key custody differs.

---

## 5. Identity-gate provenance (anti-Sybil)

`/api/registry/initiate-verification` + `validateRegistration` enforce, in order:

1. **Registration rules** — one email = one identity; firms must use their own-domain email;
   **employees** must attach to a registered firm and not reuse its main email; **experts** are
   independent (free-text affiliation, no firm prerequisite).
2. **SerpAPI web check** — name + affiliation searched two-by-two; passes if any pair returns public
   records. Soft by default; `SERP_STRICT=true` blocks only when every pair returns nothing.
   API/network errors never hard-block.
3. **Email OTP** — one server-generated 6-digit code stored in `STATE.pendingVerifications`, emailed
   via Resend, required at `/api/registry/register`, deleted on use (no replay). `DEMO_MODE=true`
   also returns it to the UI as a fail-safe.

**Disclosed limitations:** a results-count web check filters obvious gibberish, not confident fakes;
real proof-of-control is the emailed OTP, which needs a verified Resend domain to reach arbitrary
recipients. With `DEMO_MODE` on, the on-screen code bypasses inbox ownership — demo only.

---

## 6. Mechanism provenance (what is NOT simplified)

Bit-identical to the thesis specification; covered by the Move unit tests in `tests/` and the
5,000-round Mesa simulation (Experiments 1–5: baseline 500; collusion sweep 2,200; δ-sensitivity 900;
composition 1,200; reputation divergence 200).

| Parameter | Value | Meaning |
|-----------|-------|---------|
| δ | 0.2 | shadow-belief mixing (Compact SPP) |
| τ_g | 0.5 | group approval threshold (baseline) |
| η / λ | 0.05 / 0.03 | Roth-Erev reinforcement up / down |
| α, β, γ | 0.4, 0.4, 0.2 | confidence weights (sum = 1) |
| Panel stratification | 30 / 30 / 40 | employee / expert / beneficiary (a model parameter, not a fixed rule) |

Worked Compact SPP example (thesis §3.5.5): prior y=0.75 → shadow=0.85 → R_q=0.978 →
payment=0.878; misreporting yields a strictly lower expected payment. VIC minting is unconditional in
both contract and tests.

> Cryptographically, the demo is a custodial MVP. **Mechanistically, it is the thesis.**

---

## 6A. Impact-measurement layer provenance (Omid Azadegan)

The optional Impact Evaluation layer (`impact_scoring.js`, `sector_benchmarks.js`/`.ts`,
`LayerAnalytics.tsx`, `iris_metrics.ts`) scores a firm's *reported* impact against its sector
benchmark. It is deliberately separate from the VIC validation mechanism above and **never gates
VIC minting** — it is an analytical aid for investors.

**Model (matches the real GIIN impact performance benchmarks).** A firm's impact is expressed as
an annualized **pace of change** (% improvement per year). That pace is compared to two real
reference points:

1. the **peer median pace** for the sector (the GIIN benchmark), and
2. the **SDG-aligned threshold pace** — the annual change needed to hit the SDG target by 2030.

Three figures result:
- `ambition_multiplier` = firm target pace / peer median
- `adjusted_score` = firm actual pace / peer median (real path only)
- `sdg_gap` = firm pace / SDG threshold

**Two paths.** REAL — a realized pace was reported → `adjusted_score` is computed. SHADOW — no
realized pace → only ambition vs benchmark is shown, and the actual outcome is **never invented**.

**Benchmark data provenance (real where published).** Peer medians and SDG thresholds live in
`sector_benchmarks.js`/`.ts`. Each row carries a `source` flag and a citation:

| Sector | Peer median | SDG threshold | Source |
|--------|-------------|---------------|--------|
| Energy | 6.1%/yr GHG reduction | 6.8%/yr (IPCC 1.5°C) | **GIIN** (Energy benchmark, Nov 2023, n≈270) |
| Financial inclusion | 11.0%/yr (Sub-Saharan Africa) | 8.5%/yr (SDG 1.4) | **GIIN** (Financial Inclusion benchmark, 2022, n≈2,000, 13 investors) |
| Climate / GHG | 6.1%/yr (proxy) | 7.6%/yr | **IPCC** threshold; peer proxied from energy |
| Agriculture | illustrative | — | GIIN benchmark exists (n≈1,200, 18 funds) but public median is behind the IRIS+ login |
| Healthcare, food waste | illustrative | — | no public GIIN median; clearly flagged |

Rows flagged `illustrative` have **no public GIIN median** and are labelled as such in the UI and
output (`illustrative: true`); they must not be presented as audited GIIN figures.

**Honest boundaries (enforced in code):** the firm's pace is compared only to the published peer
median and SDG threshold — never to an invented actual outcome; sectors without a published GIIN
figure are flagged `illustrative` and given lower confidence; the output is an explicitly
context-adjusted score, **not** a measurement of real-world impact. A legacy input mode (capital +
reported target) is retained for backward compatibility and flagged `legacy_mode` when used. External
context (World Bank, FRED) is optional enrichment fetched with a timeout — if unreachable, scoring
proceeds without it.

**Auto-scoring at submission (optional).** When a firm submits a claim *and* provides the needed
inputs (a sector and at least a target pace), the system computes this score automatically and
attaches it to the claim as `auto_score`, flagged `automated: true` with a disclaimer that it is
optional guidance and may be imperfect. Validators see it — alongside the declaration and the Walrus
evidence — before voting, so they judge on substance rather than nothing. If the inputs are absent, no
score is produced and validators judge on the declaration and evidence alone. The auto-score never
gates or alters the claim or the VIC; it is advisory only.

**Metric framework:** the metric set in `iris_metrics.ts` aligns to **IRIS+** (GIIN, IRIS Catalog of
Metrics v5.1; codes such as PI4060, PI2822, OI6613). Codes/versions should be confirmed against the
current catalog at `iris.thegiin.org`.

**References for this layer:**
- Global Impact Investing Network (GIIN). *Impact Performance Benchmarks* (financial inclusion 2022;
  energy & agriculture 2023; forestry & healthcare 2024). https://thegiin.org/benchmarks/
- GIIN. *IRIS+ Catalog of Metrics v5.1.* https://iris.thegiin.org
- IPCC. *Global Warming of 1.5°C* — emissions-reduction pathways (≈6.8–7.6%/yr to 2030).
- UN Sustainable Development Goals — SDG-aligned thresholds (e.g. SDG 1.4 for financial inclusion).
  (Full bibliography in the thesis chapter on impact measurement.)

---

## 7. Provenance of the Winnow / MSM example (real relationship, illustrative figures)

The supervisor asked for a real case comparing DIVG against traditional and Web3 alternatives.

**Real and publicly documented:** Mustard Seed (now **Mustard Seed MAZE**, Lisbon) has backed
**Winnow** (AI-driven food-waste reduction) across multiple rounds — co-led Winnow's Series B; MSM
co-founder Henry Wigan is on record. Winnow operates in 70+ countries; its IKEA partnership publicly
reports ~50% food-waste reduction across 400+ stores. *Sources: hospitalitynet.org,
winnowsolutions.com, compasslist.com, thecaterer.com.*

**Illustrative (not Winnow's published results):** the demo claim — *47% reduction across 120 sites in
Portugal & Spain, Q1 2025, ~380 t food, ~1,140 t CO₂e* — is a constructed scenario for walkthrough
purposes, labelled as such in the thesis. It must not be presented as an audited Winnow disclosure.

**Demo data path:** `POST /api/seed/winnow` populates the Winnow firm + a stratified validator pool
(seed entries use clearly-synthetic emails such as `*.example`). The seed bypasses the live identity
gate by design (it writes directly to state), so it cannot be mistaken for real registrations.

---

## 8. Real-firm onboarding (e.g. MAZE) — provenance of the "seamless" claim

To avoid overclaiming: there is **no special MAZE code path**. A real firm uses the **same** flow as
the demo. What exists today:

- **Guided demo mode** — seed the real Winnow/MSM case and walk Identity → Claim → Validation →
  Voting → Credential → Advisory via `/walkthrough`, showing a firm exactly what its own run looks like.
- **Real run** — a firm can register from its own domain, submit its own claim, draw a panel, and
  receive a VIC right now. The **only** thing simplified versus production is **key custody** (custodial
  signing, §4), not the workflow.

**Roadmap to true self-service onboarding:** WaaP/Ika non-custodial signing + sponsored
transactions (firm pays nothing in gas), real validator marketplace, and persistent storage — at which
point MAZE (or any fund) onboards end-to-end with no platform key custody.

---

## 9. Third-party dependencies & references

**Runtime services:** SUI Testnet, Hedera Consensus Service (optional), Walrus testnet, SerpAPI,
Resend, Google Gemini API (optional — AI agent & site assistant), Vercel (frontend), Render (backend).

**Key libraries:** `@mysten/sui`, `@hashgraph/sdk`, `resend`, `express`, `axios`, `react`,
`react-router-dom`, `react-globe.gl`, `framer-motion`, `lucide-react`. (The Python ABM uses only the
standard library — no third-party Python packages.)

**Academic references:** Witkowski & Parkes (2012), *Peer prediction without a common prior*, ACM EC;
Tesfatsion (2005), *Agent-Based Computational Economics*. **Impact-measurement layer (Omid):** GIIN
IRIS+ Catalog v5.1; GIIN Impact Performance Benchmarks and IPCC/SDG thresholds (see §6A). (Full bibliography in the
thesis.)

**Reused author asset:** the custodial-MVP pattern and the `SignatureGlobe` visual mark carry over
from the author's earlier IOTA-based project (TrustCycle, 2026).

---

## 10. Reviewer checklist

- [ ] `sui move test` passes (mechanism math + access control).
- [ ] `sui client publish` yields a PackageID; registering an entity returns a real SUI digest.
- [ ] A validation round returns a Hedera topic sequence (HashScan) and a Walrus blob id.
- [ ] `npm run verify ./example-vic.json` validates a credential with no backend running.
- [ ] Backend logs show real vs `:SIM` paths matching which credentials are configured.
- [ ] Winnow/MSM relationship verifiable via the cited public sources; demo figures understood as illustrative.

---

*Provenance maintained by Saba Azadegan (protocol, contracts, frontend) with Omid Azadegan
(impact-measurement layer, §6A). Updated alongside the production roadmap as each simulated path is
replaced by its non-custodial equivalent.*