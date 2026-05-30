/// Tests for divg::divg — the immutable core module.
/// Verifies identity registration, claim submission, VIC minting,
/// and the unconditional minting principle from the thesis.
///
/// Uses sui::test_scenario to simulate multi-party transactions.
#[test_only]
module divg::divg_tests {
    use sui::test_scenario as ts;
    use divg::divg::{Self, AdminCap, Registry, Claim, VIC};

    // Test addresses
    const ADMIN  : address = @0xA;
    const FIRM   : address = @0xF;
    const VAL_E  : address = @0xE;   // employee validator
    const VAL_X  : address = @0x10;  // expert validator
    const VAL_B  : address = @0xB;   // beneficiary validator

    // ═════════════════════════════════════════════════════════════
    // TEST 1 — Init creates AdminCap and shared Registry
    // ═════════════════════════════════════════════════════════════
    #[test]
    fun test_init_creates_admin_and_registry() {
        let mut scenario = ts::begin(ADMIN);
        {
            divg::test_init(ts::ctx(&mut scenario));
        };

        // Move to next tx and check admin received AdminCap
        ts::next_tx(&mut scenario, ADMIN);
        {
            let cap = ts::take_from_sender<AdminCap>(&scenario);
            ts::return_to_sender(&scenario, cap);
        };

        // Check shared Registry exists
        ts::next_tx(&mut scenario, ADMIN);
        {
            let registry = ts::take_shared<Registry>(&scenario);
            assert!(divg::total_entities(&registry) == 0, 1);
            ts::return_shared(registry);
        };
        ts::end(scenario);
    }

    // ═════════════════════════════════════════════════════════════
    // TEST 2 — Register validators across the three stakeholder groups
    // ═════════════════════════════════════════════════════════════
    #[test]
    fun test_register_stratified_validators() {
        let mut scenario = ts::begin(ADMIN);
        {
            divg::test_init(ts::ctx(&mut scenario));
        };

        // Register one validator per group
        ts::next_tx(&mut scenario, ADMIN);
        {
            let cap          = ts::take_from_sender<AdminCap>(&scenario);
            let mut registry = ts::take_shared<Registry>(&scenario);

            divg::register_entity(
                &cap, &mut registry, VAL_E,
                b"Marc Zornes", b"Winnow CEO",
                b"did:divg:e1", divg::group_employee(),
                ts::ctx(&mut scenario)
            );
            divg::register_entity(
                &cap, &mut registry, VAL_X,
                b"Tessa Clarke", b"OLIO CEO MSM Venture Partner",
                b"did:divg:x1", divg::group_expert(),
                ts::ctx(&mut scenario)
            );
            divg::register_entity(
                &cap, &mut registry, VAL_B,
                b"Chef Antonio", b"IKEA Restaurant Manager",
                b"did:divg:b1", divg::group_beneficiary(),
                ts::ctx(&mut scenario)
            );

            assert!(divg::total_entities(&registry) == 3, 2);
            assert!(divg::get_group(&registry, VAL_E) == divg::group_employee(), 3);
            assert!(divg::get_group(&registry, VAL_X) == divg::group_expert(), 4);
            assert!(divg::get_group(&registry, VAL_B) == divg::group_beneficiary(), 5);

            // Initial reputation is 500 (midpoint of U[0.4, 0.6])
            assert!(divg::get_reputation(&registry, VAL_E) == 500, 6);

            ts::return_to_sender(&scenario, cap);
            ts::return_shared(registry);
        };
        ts::end(scenario);
    }

    // ═════════════════════════════════════════════════════════════
    // TEST 3 — Reputation update (Roth-Erev reinforcement)
    //   Aligned vote: reputation increases by η = 50
    //   Misaligned:   reputation decreases by λ = 30
    // ═════════════════════════════════════════════════════════════
    #[test]
    fun test_reputation_roth_erev_update() {
        let mut scenario = ts::begin(ADMIN);
        {
            divg::test_init(ts::ctx(&mut scenario));
        };

        ts::next_tx(&mut scenario, ADMIN);
        {
            let cap          = ts::take_from_sender<AdminCap>(&scenario);
            let mut registry = ts::take_shared<Registry>(&scenario);

            divg::register_entity(
                &cap, &mut registry, VAL_E,
                b"Test Validator", b"Test Org",
                b"did:divg:test", divg::group_employee(),
                ts::ctx(&mut scenario)
            );

            // Aligned with consensus → reputation increases by η=50
            divg::update_reputation(&cap, &mut registry, VAL_E, true);
            assert!(divg::get_reputation(&registry, VAL_E) == 550, 7);

            // Misaligned → reputation decreases by λ=30
            divg::update_reputation(&cap, &mut registry, VAL_E, false);
            assert!(divg::get_reputation(&registry, VAL_E) == 520, 8);

            // Multiple alignments → reputation grows but clamps at 1000
            let mut i = 0;
            while (i < 20) {
                divg::update_reputation(&cap, &mut registry, VAL_E, true);
                i = i + 1;
            };
            assert!(divg::get_reputation(&registry, VAL_E) == 1000, 9);

            ts::return_to_sender(&scenario, cap);
            ts::return_shared(registry);
        };
        ts::end(scenario);
    }

    // ═════════════════════════════════════════════════════════════
    // TEST 4 — Firm submits a claim
    // ═════════════════════════════════════════════════════════════
    #[test]
    fun test_firm_submits_claim() {
        let mut scenario = ts::begin(ADMIN);
        {
            divg::test_init(ts::ctx(&mut scenario));
        };

        // Admin registers Winnow as a firm
        ts::next_tx(&mut scenario, ADMIN);
        {
            let cap          = ts::take_from_sender<AdminCap>(&scenario);
            let mut registry = ts::take_shared<Registry>(&scenario);
            divg::register_entity(
                &cap, &mut registry, FIRM,
                b"Winnow", b"MSM Fund portfolio company",
                b"did:divg:winnow", divg::group_firm(),
                ts::ctx(&mut scenario)
            );
            ts::return_to_sender(&scenario, cap);
            ts::return_shared(registry);
        };

        // Firm submits an impact claim
        ts::next_tx(&mut scenario, ADMIN);
        {
            let cap      = ts::take_from_sender<AdminCap>(&scenario);
            let registry = ts::take_shared<Registry>(&scenario);
            divg::submit_claim(
                &cap, &registry, FIRM,
                b"abc123hashbytes",
                b"Winnow reduced food waste 47% across 120 sites Q1 2025",
                ts::ctx(&mut scenario)
            );
            ts::return_to_sender(&scenario, cap);
            ts::return_shared(registry);
        };

        // Verify the claim was shared
        ts::next_tx(&mut scenario, ADMIN);
        {
            let claim = ts::take_shared<Claim>(&scenario);
            ts::return_shared(claim);
        };
        ts::end(scenario);
    }

    // ═════════════════════════════════════════════════════════════
    // TEST 5 — VIC minted UNCONDITIONALLY when D=1 (high consensus)
    //   This verifies the thesis principle: minting does not depend
    //   on consensus outcome — only metadata embedded changes.
    // ═════════════════════════════════════════════════════════════
    #[test]
    fun test_vic_minted_with_high_consensus() {
        let mut scenario = setup_with_claim();

        ts::next_tx(&mut scenario, ADMIN);
        {
            let cap   = ts::take_from_sender<AdminCap>(&scenario);
            let claim = ts::take_shared<Claim>(&scenario);

            // Mint VIC with D=1, Conf=0.915, S_agg=0.846
            divg::mint_vic(
                &cap,
                b"did:divg:winnow", b"abc123",
                1,         // d_final = 1 (high consensus)
                915,       // Conf(c) = 0.915
                846,       // S_agg = 0.846
                30,        // total validators
                25,        // approved
                1,         // round_count (primary only)
                b"0.0.123456",  // Hedera topic
                42,        // HCS sequence
                ts::ctx(&mut scenario)
            );

            ts::return_to_sender(&scenario, cap);
            ts::return_shared(claim);
        };

        // Verify VIC exists with expected metadata
        ts::next_tx(&mut scenario, ADMIN);
        {
            let vic = ts::take_shared<VIC>(&scenario);
            assert!(divg::vic_d_final(&vic) == 1,      10);
            assert!(divg::vic_conf(&vic) == 915,       11);
            assert!(divg::vic_s_agg(&vic) == 846,      12);
            assert!(divg::vic_total(&vic) == 30,       13);
            assert!(divg::vic_approved(&vic) == 25,    14);
            assert!(divg::vic_hedera_seq(&vic) == 42,  15);
            ts::return_shared(vic);
        };
        ts::end(scenario);
    }

    // ═════════════════════════════════════════════════════════════
    // TEST 6 — VIC ALSO minted when D=0 (low consensus)
    //   The unconditional minting principle: D_final and Conf(c) are
    //   METADATA, not minting gates. The platform is a non-custodial
    //   transparency layer, not a gatekeeper.
    // ═════════════════════════════════════════════════════════════
    #[test]
    fun test_vic_minted_with_low_consensus() {
        let mut scenario = setup_with_claim();

        ts::next_tx(&mut scenario, ADMIN);
        {
            let cap   = ts::take_from_sender<AdminCap>(&scenario);
            let claim = ts::take_shared<Claim>(&scenario);

            // Mint VIC even with D=0 — this is the key thesis principle
            divg::mint_vic(
                &cap,
                b"did:divg:winnow", b"abc123",
                0,         // d_final = 0 (low / contested)
                420,       // Conf(c) = 0.42 (below 0.5 threshold)
                380,       // S_agg
                30,        // total
                12,        // approved (only 12/30 — below τ_g)
                2,         // secondary round triggered
                b"0.0.123456",
                43,
                ts::ctx(&mut scenario)
            );

            ts::return_to_sender(&scenario, cap);
            ts::return_shared(claim);
        };

        // VIC still minted — proof of unconditional principle
        ts::next_tx(&mut scenario, ADMIN);
        {
            let vic = ts::take_shared<VIC>(&scenario);
            assert!(divg::vic_d_final(&vic) == 0,  16);
            assert!(divg::vic_conf(&vic) == 420,   17);
            // Contested claim is still recorded — investors see the
            // metadata and decide via σ(C), but the credential exists.
            ts::return_shared(vic);
        };
        ts::end(scenario);
    }

    // ═════════════════════════════════════════════════════════════
    // TEST 7 — Advisory signal σ(C) on a minted VIC
    // ═════════════════════════════════════════════════════════════
    #[test]
    fun test_advisory_signal_on_vic() {
        let mut scenario = setup_with_claim();

        ts::next_tx(&mut scenario, ADMIN);
        {
            let cap   = ts::take_from_sender<AdminCap>(&scenario);
            let claim = ts::take_shared<Claim>(&scenario);
            divg::mint_vic(
                &cap, b"did:divg:winnow", b"abc123", 1, 915, 846, 30, 25, 1,
                b"0.0.123456", 42, ts::ctx(&mut scenario)
            );
            ts::return_to_sender(&scenario, cap);
            ts::return_shared(claim);
        };

        ts::next_tx(&mut scenario, ADMIN);
        {
            let vic = ts::take_shared<VIC>(&scenario);
            // Conservative investor (θ = 0.85) → PROCEED
            assert!(divg::advisory_signal(&vic, 850) == 1, 18);
            // Very strict investor (θ = 0.99) → CAUTION
            assert!(divg::advisory_signal(&vic, 990) == 0, 19);
            ts::return_shared(vic);
        };
        ts::end(scenario);
    }

    // ═════════════════════════════════════════════════════════════
    // TEST 8 — Cannot register the same address twice
    // ═════════════════════════════════════════════════════════════
    #[test]
    #[expected_failure(abort_code = 2)]  // E_ALREADY_EXISTS
    fun test_duplicate_registration_fails() {
        let mut scenario = ts::begin(ADMIN);
        {
            divg::test_init(ts::ctx(&mut scenario));
        };

        ts::next_tx(&mut scenario, ADMIN);
        {
            let cap          = ts::take_from_sender<AdminCap>(&scenario);
            let mut registry = ts::take_shared<Registry>(&scenario);

            divg::register_entity(
                &cap, &mut registry, VAL_E,
                b"Alice", b"Org",
                b"did:divg:alice", divg::group_employee(),
                ts::ctx(&mut scenario)
            );
            // Second registration of same address should abort
            divg::register_entity(
                &cap, &mut registry, VAL_E,
                b"Alice Twin", b"Other Org",
                b"did:divg:alice2", divg::group_expert(),
                ts::ctx(&mut scenario)
            );

            ts::return_to_sender(&scenario, cap);
            ts::return_shared(registry);
        };
        ts::end(scenario);
    }

    // ═════════════════════════════════════════════════════════════
    // TEST 9 — Non-firm cannot submit a claim
    // ═════════════════════════════════════════════════════════════
    #[test]
    #[expected_failure(abort_code = 4)]  // E_NOT_FIRM
    fun test_non_firm_cannot_submit_claim() {
        let mut scenario = ts::begin(ADMIN);
        {
            divg::test_init(ts::ctx(&mut scenario));
        };

        // Register VAL_E as an EMPLOYEE (not a firm)
        ts::next_tx(&mut scenario, ADMIN);
        {
            let cap          = ts::take_from_sender<AdminCap>(&scenario);
            let mut registry = ts::take_shared<Registry>(&scenario);
            divg::register_entity(
                &cap, &mut registry, VAL_E,
                b"Employee Eve", b"Some Co",
                b"did:divg:eve", divg::group_employee(),
                ts::ctx(&mut scenario)
            );
            ts::return_to_sender(&scenario, cap);
            ts::return_shared(registry);
        };

        // Admin tries to submit a claim FOR Eve (an employee, not a firm) — must fail
        ts::next_tx(&mut scenario, ADMIN);
        {
            let cap      = ts::take_from_sender<AdminCap>(&scenario);
            let registry = ts::take_shared<Registry>(&scenario);
            divg::submit_claim(
                &cap, &registry, VAL_E,
                b"hashbytes",
                b"unauthorized claim",
                ts::ctx(&mut scenario)
            );
            ts::return_to_sender(&scenario, cap);
            ts::return_shared(registry);
        };
        ts::end(scenario);
    }

    // ═════════════════════════════════════════════════════════════
    // HELPER — set up a scenario with an admin, firm, and claim
    // ═════════════════════════════════════════════════════════════
    fun setup_with_claim(): ts::Scenario {
        let mut scenario = ts::begin(ADMIN);
        {
            divg::test_init(ts::ctx(&mut scenario));
        };

        ts::next_tx(&mut scenario, ADMIN);
        {
            let cap          = ts::take_from_sender<AdminCap>(&scenario);
            let mut registry = ts::take_shared<Registry>(&scenario);
            divg::register_entity(
                &cap, &mut registry, FIRM,
                b"Winnow", b"MSM Portfolio",
                b"did:divg:winnow", divg::group_firm(),
                ts::ctx(&mut scenario)
            );
            ts::return_to_sender(&scenario, cap);
            ts::return_shared(registry);
        };

        ts::next_tx(&mut scenario, ADMIN);
        {
            let cap      = ts::take_from_sender<AdminCap>(&scenario);
            let registry = ts::take_shared<Registry>(&scenario);
            divg::submit_claim(
                &cap, &registry, FIRM,
                b"abc123",
                b"Test claim",
                ts::ctx(&mut scenario)
            );
            ts::return_to_sender(&scenario, cap);
            ts::return_shared(registry);
        };
        scenario
    }
}
