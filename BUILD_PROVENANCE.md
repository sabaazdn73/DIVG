# BUILD PROVENANCE — DIVG

This document is an explicit, honest account of what existed **before** the SUI Overflow 2026
build period and what was built **during** it (May 7 – June 21, 2026). Sui Overflow permits
existing projects provided substantial new functionality and integrations are developed during
the build period; this document records exactly that boundary.

---

## Summary

DIVG is the implementation of an MSc thesis in the impact-investing field (Católica Lisbon,
2025/26). The **research** — the mechanism design and its validation — is prior academic work.
The **entire working system** — contracts, storage, credentials, and application — was built
during the Overflow build period. The thesis was the idea; Overflow is where it became a
running, on-chain product.

---

## BEFORE the hackathon — academic research (thesis groundwork)

These are conceptual and analytical contributions of the thesis. They are *not* claimed as
hackathon work:

- **The problem framing:** verifying self-attested impact claims without a trusted central
  auditor, in the context of impact investing and impact washing.
- **The mechanism choice and design:** combining Self-Sovereign Identity (SSI), decentralised
  (DAO-style) governance, and the **Compact Shadow Private-Prior Peer Prediction (Compact SPP)**
  peer-prediction mechanism (after Witkowski & Parkes), including the shadowing transform, the
  proper scoring rule, the cost term, and the truth-telling (strict Nash) argument.
- **The reputation model** (Roth-Erev parameters) and the confidence/decision definitions
  (Conf(c), D_final, the advisory σ(C) rule) at the conceptual level.
- **The agent-based simulation study** (≈5,000 rounds) establishing baseline accuracy and
  collusion resistance — the analytical validation reported in the thesis.

---

## DURING the hackathon — implementation (May 7 – June 21, 2026)

Everything below is new functionality, integration, and engineering developed in the build
period. This is the substantial new work that turned the paper mechanism into a product:

1. **Sui Move smart contracts.** The on-chain `divg` package: `register_entity`,
   `submit_claim`, and `mint_vic`, deployed to Sui testnet, with the Registry as a shared
   object and an AdminCap authority model.

2. **Dual-ledger anchoring.** Sui as the settlement/credential layer plus a Hedera Consensus
   Service audit log recording each state transition.

3. **Walrus decentralised storage integration.** Each Verifiable Impact Credential (VIC) — with
   its full pseudonymous verification graph — is serialised and stored as a Walrus blob on mint,
   with a read path that retrieves credentials directly from Walrus, independent of the backend.

4. **The Verifiable Impact Credential (VIC) certificate.** A shareable "Credential of Record"
   that renders the consensus result and a verification-graph bubble-map (firm → claim →
   validator panel coloured by stakeholder group with votes shown → investor advisory signal),
   plus a pseudonymous DID list. Privacy model: firm revealed, validators and investors
   pseudonymous (DID/score only, no names).

5. **Decentralised shareable credentials.** Credential links that resolve from Walrus and
   survive a full backend reset — demonstrating persistence independent of our infrastructure.

6. **The orchestration backend.** Node/Express service wiring the Move calls, the Hedera audit
   log, the Walrus storage, and the Python agent-based round into one pipeline, with a live
   sandbox and a seeded case-study example.

7. **The full web application.** The five-layer interactive walkthrough (Identity, Claim,
   Validation, Credential, Advisory), the sandbox, the live demo experience, branding, and SEO.

---

## Honest boundary statement (for judges / committee)

> The mechanism design and its agent-based validation are prior academic work from the MSc
> thesis. All implementation in this repository — the Sui Move contracts and testnet deployment,
> the Hedera audit integration, the Walrus decentralised-storage layer, the credential
> certificate and verification graph, the decentralised shareable credentials, and the web
> application — was built during the SUI Overflow 2026 build period. DIVG is the point at which
> the thesis mechanism became a running, independently-verifiable product on Sui.

