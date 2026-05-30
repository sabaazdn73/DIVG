/// divg::scoring
/// UPGRADEABLE R&D MODULE — peer-prediction mechanism implementation.
///
/// Current implementation: Compact Shadow Private-Prior Peer Prediction
///                         (Witkowski & Parkes, 2012)
///
/// This module can be REPLACED via governance vote without redeploying
/// the identity, claim, or VIC layers. Future variants the architecture
/// can absorb without breaking on-chain state:
///   • Continuous-signal SPP (multi-valued x_i ∈ [0,1])
///   • Bayesian Truth Serum (BTS, Prelec 2004) for large panels
///   • Mechanism design upgrades from post-2012 literature
///
/// Replacement procedure (R&D principle, thesis Section 3.5.3 ii):
///   1. Write divg::scoring_v2 implementing the new payment rule
///   2. Update divg::divg::advisory_signal to call scoring_v2
///   3. Publish package upgrade via Sui's package upgrade mechanism
///   4. Existing VICs and Registry remain valid and unchanged
module divg::scoring {

    // ═══ COMPACT SPP CONSTANTS (scaled x1000) ═════════════════════
    // δ = 0.2: Compact SPP mechanism parameter
    //   - inlined as 600 = (1−2δ)·1000 and 400 = 2δ·1000
    //   - satisfies δ ≠ 0.5 (strict incentive compatibility)
    //   - satisfies δ ≤ 0.5 (individual rationality)
    const COST_X1000 : u64 = 100;   // c_i = 0.1, private effort cost

    // Confidence formula weights (α + β + γ = 1.0)
    const ALPHA_X1000 : u64 = 400;  // α = 0.4 (agreement weight)
    const BETA_X1000  : u64 = 400;  // β = 0.4 (diversity weight)
    const GAMMA_X1000 : u64 = 200;  // γ = 0.2 (path stability weight)

    // ═══ COMPACT SPP: SHADOW POSTERIOR ════════════════════════════
    /// shadow_i = (1 − 2δ) · y_i + 2δ · x_i
    /// With δ = 0.2: shadow = 0.6 · y_i + 0.4 · x_i
    public fun compute_shadow(prior_x1000: u64, vote: u8): u64 {
        let py = 600 * prior_x1000 / 1000;
        let px = if (vote == 1) 400 else 0;
        let s  = py + px;
        if (s > 1000) 1000 else s
    }

    // ═══ BINARY QUADRATIC SCORING RULE ════════════════════════════
    /// R_q(y, ω = 1) = 2y − y²
    /// R_q(y, ω = 0) = 1 − y²
    public fun rq_score(shadow_x1000: u64, reference_vote: u8): u64 {
        let sq = shadow_x1000 * shadow_x1000 / 1000;
        if (reference_vote == 1) {
            let r = 2 * shadow_x1000;
            if (r > sq) r - sq else 0
        } else {
            if (1000 > sq) 1000 - sq else 0
        }
    }

    // ═══ COMPACT SPP PAYMENT ══════════════════════════════════════
    /// Score_i = R_q(shadow_i, x_j) − c_i
    /// where x_j is the randomly drawn reference peer's signal report
    public fun compact_spp_payment(
        prior_x1000    : u64,
        vote           : u8,
        reference_vote : u8,
    ): u64 {
        let shadow = compute_shadow(prior_x1000, vote);
        let rq     = rq_score(shadow, reference_vote);
        if (rq > COST_X1000) rq - COST_X1000 else 0
    }

    // ═══ CONFIDENCE SCORE ═════════════════════════════════════════
    /// Conf(c) = α · A + β · Ψ + γ · T
    /// A = global agreement density · Ψ = inter-group divergence · T = path stability
    public fun confidence(
        a_x1000   : u64,
        psi_x1000 : u64,
        t_x1000   : u64,
    ): u64 {
        (ALPHA_X1000 * a_x1000   / 1000) +
        (BETA_X1000  * psi_x1000 / 1000) +
        (GAMMA_X1000 * t_x1000   / 1000)
    }

    // ═══ INVESTOR ADVISORY σ(C) ═══════════════════════════════════
    /// σ(C) = 1 if D_final = 1 AND Conf(c) ≥ θ, else 0
    /// STRICTLY ADVISORY — never restricts claim publication
    public fun advisory(d_final: u8, conf_x1000: u64, theta_x1000: u64): u8 {
        if (d_final == 1 && conf_x1000 >= theta_x1000) 1 else 0
    }

    // ═══ INTROSPECTION (lets investors verify which version is live) ══
    public fun mechanism_name(): vector<u8> {
        b"Compact-SPP-Witkowski-Parkes-2012"
    }
    public fun mechanism_version(): u64 { 1 }
    public fun delta_x1000(): u64       { 200 }
    public fun cost_x1000(): u64        { COST_X1000 }
}
