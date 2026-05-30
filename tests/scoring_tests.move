/// Tests for divg::scoring — the upgradeable peer-prediction module.
/// Verifies that the on-chain math matches the Compact SPP formulas
/// from Witkowski & Parkes (2012) used throughout Chapter 3 of the thesis.
///
/// Run from move/ directory:   sui move test
#[test_only]
module divg::scoring_tests {
    use divg::scoring;

    // ═════════════════════════════════════════════════════════════
    // TEST 1 — Shadow posterior matches the Maze Fund / Winnow
    //          worked example from the thesis use case.
    //
    // Validator v_7: prior y_i = 0.75, vote x_i = 1, δ = 0.2
    // shadow = (1 - 2·0.2) · 0.75 + 2·0.2 · 1 = 0.6 · 0.75 + 0.4 = 0.85
    // ═════════════════════════════════════════════════════════════
    #[test]
    fun test_shadow_thesis_example() {
        // y = 0.75 → 750, vote = 1
        let shadow = scoring::compute_shadow(750, 1);
        // Expected: 0.85 → 850
        assert!(shadow == 850, 1);
    }

    #[test]
    fun test_shadow_low_prior_negative_vote() {
        // y = 0.30, vote = 0 → shadow = 0.6·0.30 + 0 = 0.18
        let shadow = scoring::compute_shadow(300, 0);
        assert!(shadow == 180, 2);
    }

    #[test]
    fun test_shadow_clamps_to_max() {
        // Edge: y = 0.99, vote = 1 → 0.6·0.99 + 0.4 = 0.994
        let shadow = scoring::compute_shadow(990, 1);
        assert!(shadow == 994, 3);
    }

    // ═════════════════════════════════════════════════════════════
    // TEST 2 — Quadratic scoring rule Rq
    //   Rq(y, ω=1) = 2y - y²
    //   Rq(y, ω=0) = 1 - y²
    //
    // Thesis worked example:
    //   Rq(0.85, 1) = 2·0.85 - 0.85² = 1.70 - 0.7225 = 0.9775
    // ═════════════════════════════════════════════════════════════
    #[test]
    fun test_rq_positive_reference_thesis_example() {
        // Rq(0.85, 1) = 0.9775  →  977 in x1000 scale
        let rq = scoring::rq_score(850, 1);
        // 2·850 - 850·850/1000 = 1700 - 722 = 978
        // (integer arithmetic — 0.9775 rounds to 978 in x1000)
        assert!(rq == 978, 4);
    }

    #[test]
    fun test_rq_negative_reference() {
        // Rq(0.85, 0) = 1 - 0.85² = 1 - 0.7225 = 0.2775
        // 1000 - 850·850/1000 = 1000 - 722 = 278
        let rq = scoring::rq_score(850, 0);
        assert!(rq == 278, 5);
    }

    #[test]
    fun test_rq_perfect_alignment() {
        // shadow = 1.0 (validator fully confident in positive),
        // reference also voted 1 → maximum score 1.0
        let rq = scoring::rq_score(1000, 1);
        assert!(rq == 1000, 6);
    }

    // ═════════════════════════════════════════════════════════════
    // TEST 3 — Full Compact SPP payment, end-to-end
    //   Score = Rq(shadow, x_j) − c_i
    //
    // Thesis: y=0.75, vote=1, ref=1, c=0.1
    //   shadow = 0.85, Rq = 0.978, Score = 0.878  → 878
    // ═════════════════════════════════════════════════════════════
    #[test]
    fun test_compact_spp_thesis_example() {
        let payment = scoring::compact_spp_payment(750, 1, 1);
        // 978 - 100 (cost) = 878
        assert!(payment == 878, 7);
    }

    #[test]
    fun test_compact_spp_misreport_is_punished() {
        // Same prior y=0.75, but validator misreports vote=0
        // shadow = 0.6·0.75 + 0 = 0.45 → 450
        // Rq(0.45, 1) = 2·0.45 - 0.45² = 0.90 - 0.2025 = 0.6975 → 697
        // Score = 697 - 100 = 597
        let honest_payment    = scoring::compact_spp_payment(750, 1, 1);
        let dishonest_payment = scoring::compact_spp_payment(750, 0, 1);
        // The honest payment must strictly exceed the misreport payment.
        // This is the on-chain enforcement of the Nash Equilibrium
        // property from Witkowski & Parkes (2012).
        assert!(honest_payment > dishonest_payment, 8);
        assert!(dishonest_payment == 598, 9);
    }

    // ═════════════════════════════════════════════════════════════
    // TEST 4 — Confidence score Conf(c) = α·A + β·Ψ + γ·T
    //
    // Thesis worked example:
    //   A = 25/30 = 0.833, Ψ = 0.956, T = 1.0
    //   Conf(c) = 0.4·0.833 + 0.4·0.956 + 0.2·1.0
    //           = 0.333 + 0.382 + 0.200 = 0.915
    // ═════════════════════════════════════════════════════════════
    #[test]
    fun test_confidence_thesis_example() {
        // Inputs scaled x1000
        let conf = scoring::confidence(833, 956, 1000);
        // 400·833/1000 + 400·956/1000 + 200·1000/1000
        // = 333 + 382 + 200 = 915
        assert!(conf == 915, 10);
    }

    #[test]
    fun test_confidence_secondary_round_penalty() {
        // If secondary round triggered, T = 0.5 instead of 1.0
        // Same A, Ψ but T drops → Conf drops by exactly γ · 0.5 = 100
        let primary   = scoring::confidence(833, 956, 1000);
        let secondary = scoring::confidence(833, 956, 500);
        assert!(primary - secondary == 100, 11);
    }

    #[test]
    fun test_confidence_low_when_groups_disagree() {
        // Strong inter-group divergence: A=0.5, Ψ=0.3, T=0.5 (secondary)
        let conf = scoring::confidence(500, 300, 500);
        // 200 + 120 + 100 = 420 → 0.420 (low-confidence band)
        assert!(conf == 420, 12);
    }

    // ═════════════════════════════════════════════════════════════
    // TEST 5 — Investor advisory σ(C)
    //   σ(C) = 1  if D_final = 1 AND Conf(c) ≥ θ
    //   σ(C) = 0  otherwise
    //   Strictly advisory — never blocks publication.
    // ═════════════════════════════════════════════════════════════
    #[test]
    fun test_advisory_proceed() {
        // D=1, Conf=0.915, θ=0.85 → PROCEED (σ=1)
        assert!(scoring::advisory(1, 915, 850) == 1, 13);
    }

    #[test]
    fun test_advisory_caution_low_confidence() {
        // D=1 but Conf=0.62 < θ=0.85 → CAUTION (σ=0)
        assert!(scoring::advisory(1, 620, 850) == 0, 14);
    }

    #[test]
    fun test_advisory_caution_low_consensus() {
        // D=0 (no consensus) → always CAUTION regardless of Conf
        assert!(scoring::advisory(0, 950, 500) == 0, 15);
    }

    #[test]
    fun test_advisory_exact_threshold() {
        // Conf exactly equal to θ → still proceed (≥, not >)
        assert!(scoring::advisory(1, 700, 700) == 1, 16);
    }

    // ═════════════════════════════════════════════════════════════
    // TEST 6 — Mechanism introspection (R&D principle)
    //   The scoring module exposes its own version, allowing
    //   investors to verify which mechanism produced a given VIC.
    // ═════════════════════════════════════════════════════════════
    #[test]
    fun test_mechanism_identification() {
        // Verifies the upgradeable module identifies itself correctly.
        // When this module is later upgraded to v2, these values change.
        assert!(scoring::mechanism_version() == 1,      17);
        assert!(scoring::delta_x1000() == 200,          18);  // δ = 0.2
        assert!(scoring::cost_x1000() == 100,           19);  // c_i = 0.1
    }
}
