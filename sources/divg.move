/// divg::divg
/// IMMUTABLE CORE — identity, claim, audit logging, VIC minting.
/// Calls divg::scoring for all peer-prediction math.
/// This module is the stable layer: upgrading the scoring rule
/// (e.g. Compact SPP → continuous-signal variant) does NOT require
/// redeploying or migrating registry / claim / VIC objects.
module divg::divg {
    use sui::event;
    use sui::table::{Self, Table};
    use std::string::{Self, String};
    use divg::scoring;

    // ═══ STAKEHOLDER GROUPS ═══════════════════════════════════════
    const GROUP_EMPLOYEE    : u8 = 0;
    const GROUP_EXPERT      : u8 = 1;
    const GROUP_BENEFICIARY : u8 = 2;
    const GROUP_FIRM        : u8 = 3;
    const GROUP_INVESTOR    : u8 = 4;

    // ═══ REPUTATION RATES (kept here — identity-layer concern) ═══
    const ETA_X1000 : u64 = 50;   // η = 0.05 reinforcement
    const LAM_X1000 : u64 = 30;   // λ = 0.03 decay

    // ═══ ERRORS ═══════════════════════════════════════════════════
    const E_ALREADY_EXISTS : u64 = 2;
    const E_NOT_FOUND      : u64 = 3;
    const E_NOT_FIRM       : u64 = 4;
    const E_INVALID_INPUT  : u64 = 6;

    // ═══ STRUCTS ══════════════════════════════════════════════════

    public struct AdminCap has key, store { id: UID }

    public struct EntityRecord has store, drop {
        did            : String,
        full_name      : String,
        affiliation    : String,
        group          : u8,
        reputation     : u64,
        active         : bool,
        registered_at  : u64,
    }

    public struct Registry has key {
        id            : UID,
        admin         : address,
        entities      : Table<address, EntityRecord>,
        total_count   : u64,
    }

    public struct Claim has key {
        id           : UID,
        issuer       : address,
        issuer_did   : String,
        claim_hash   : vector<u8>,
        description  : String,
        submitted_at : u64,
    }

    /// VIC — minted unconditionally. Metadata embedded.
    public struct VIC has key, store {
        id                  : UID,
        claim_hash          : vector<u8>,
        firm_did            : String,
        d_final             : u8,
        conf_x1000          : u64,
        s_agg_x1000         : u64,
        total_validators    : u64,
        validators_approved : u64,
        round_count         : u8,
        hedera_topic_id     : String,
        hedera_sequence     : u64,
        minted_at           : u64,
    }

    // ═══ EVENTS ═══════════════════════════════════════════════════

    public struct EntityRegistered has copy, drop {
        addr  : address, did: String, group: u8,
    }
    public struct ClaimSubmitted has copy, drop {
        claim_id: ID, issuer: address, claim_hash: vector<u8>, epoch: u64,
    }
    public struct VICMinted has copy, drop {
        vic_id: ID, claim_hash: vector<u8>, d_final: u8,
        conf_x1000: u64, s_agg_x1000: u64,
        validators_approved: u64, minted_at: u64,
    }

    // ═══ INIT ═════════════════════════════════════════════════════

    fun init(ctx: &mut TxContext) {
        let admin = tx_context::sender(ctx);
        transfer::transfer(AdminCap { id: object::new(ctx) }, admin);
        transfer::share_object(Registry {
            id          : object::new(ctx),
            admin,
            entities    : table::new(ctx),
            total_count : 0,
        });
    }

    // Test-only wrapper to call init() from sui::test_scenario
    #[test_only]
    public fun test_init(ctx: &mut TxContext) {
        init(ctx);
    }

    // ═══ REGISTRY ═════════════════════════════════════════════════

    public fun register_entity(
        _cap        : &AdminCap,
        registry    : &mut Registry,
        addr        : address,
        full_name   : vector<u8>,
        affiliation : vector<u8>,
        did         : vector<u8>,
        group       : u8,
        ctx         : &mut TxContext,
    ) {
        assert!(!table::contains(&registry.entities, addr), E_ALREADY_EXISTS);
        let did_str = string::utf8(did);
        table::add(&mut registry.entities, addr, EntityRecord {
            did           : did_str,
            full_name     : string::utf8(full_name),
            affiliation   : string::utf8(affiliation),
            group,
            reputation    : 500,
            active        : true,
            registered_at : tx_context::epoch(ctx),
        });
        registry.total_count = registry.total_count + 1;
        event::emit(EntityRegistered { addr, did: did_str, group });
    }

    public fun update_reputation(
        _cap     : &AdminCap,
        registry : &mut Registry,
        addr     : address,
        aligned  : bool,
    ) {
        if (!table::contains(&registry.entities, addr)) return;
        let record = table::borrow_mut(&mut registry.entities, addr);
        if (aligned) {
            let new_rep = record.reputation + ETA_X1000;
            record.reputation = if (new_rep > 1000) 1000 else new_rep;
        } else {
            record.reputation = if (record.reputation > LAM_X1000)
                                 record.reputation - LAM_X1000 else 0;
        }
    }

    // ═══ CLAIM ════════════════════════════════════════════════════

    /// Submit a claim on behalf of a firm.
    /// Custodial-MVP model: the platform (AdminCap holder) submits claims
    /// on behalf of firms. The firm is identified by its DID, which is
    /// validated against the registry to confirm it is a registered firm.
    public fun submit_claim(
        _cap        : &AdminCap,
        registry    : &Registry,
        firm_addr   : address,
        claim_hash  : vector<u8>,
        description : vector<u8>,
        ctx         : &mut TxContext,
    ) {
        assert!(table::contains(&registry.entities, firm_addr), E_NOT_FIRM);
        let r = table::borrow(&registry.entities, firm_addr);
        assert!(r.group == GROUP_FIRM && r.active, E_NOT_FIRM);

        let uid   = object::new(ctx);
        let cid   = object::uid_to_inner(&uid);
        let epoch = tx_context::epoch(ctx);

        event::emit(ClaimSubmitted {
            claim_id: cid, issuer: firm_addr, claim_hash, epoch,
        });

        transfer::share_object(Claim {
            id           : uid,
            issuer       : firm_addr,
            issuer_did   : r.did,
            claim_hash,
            description  : string::utf8(description),
            submitted_at : epoch,
        });
    }

    // ═══ VIC MINT — UNCONDITIONAL ═════════════════════════════════

    public fun mint_vic(
        _cap                : &AdminCap,
        firm_did            : vector<u8>,
        claim_hash          : vector<u8>,
        d_final             : u8,
        conf_x1000          : u64,
        s_agg_x1000         : u64,
        total_validators    : u64,
        validators_approved : u64,
        round_count         : u8,
        hedera_topic        : vector<u8>,
        hedera_seq          : u64,
        ctx                 : &mut TxContext,
    ) {
        assert!(d_final == 0 || d_final == 1, E_INVALID_INPUT);
        assert!(conf_x1000 <= 1000, E_INVALID_INPUT);

        let epoch    = tx_context::epoch(ctx);
        let uid      = object::new(ctx);
        let vic_id   = object::uid_to_inner(&uid);

        event::emit(VICMinted {
            vic_id, claim_hash, d_final,
            conf_x1000, s_agg_x1000,
            validators_approved,
            minted_at: epoch,
        });

        transfer::share_object(VIC {
            id                  : uid,
            claim_hash,
            firm_did            : string::utf8(firm_did),
            d_final,
            conf_x1000,
            s_agg_x1000,
            total_validators,
            validators_approved,
            round_count,
            hedera_topic_id     : string::utf8(hedera_topic),
            hedera_sequence     : hedera_seq,
            minted_at           : epoch,
        });
    }

    // ═══ ADVISORY σ(C) — uses scoring module ═══════════════════════

    public fun advisory_signal(vic: &VIC, theta_x1000: u64): u8 {
        scoring::advisory(vic.d_final, vic.conf_x1000, theta_x1000)
    }

    // ═══ READ HELPERS ═════════════════════════════════════════════

    public fun get_reputation(r: &Registry, addr: address): u64 {
        if (!table::contains(&r.entities, addr)) return 0;
        table::borrow(&r.entities, addr).reputation
    }
    public fun get_group(r: &Registry, addr: address): u8 {
        assert!(table::contains(&r.entities, addr), E_NOT_FOUND);
        table::borrow(&r.entities, addr).group
    }
    public fun total_entities(r: &Registry): u64 { r.total_count }
    public fun vic_d_final(v: &VIC)        : u8  { v.d_final }
    public fun vic_conf(v: &VIC)           : u64 { v.conf_x1000 }
    public fun vic_s_agg(v: &VIC)          : u64 { v.s_agg_x1000 }
    public fun vic_approved(v: &VIC)       : u64 { v.validators_approved }
    public fun vic_total(v: &VIC)          : u64 { v.total_validators }
    public fun vic_hedera_seq(v: &VIC)     : u64 { v.hedera_sequence }

    // Group constants
    public fun group_employee()    : u8 { GROUP_EMPLOYEE }
    public fun group_expert()      : u8 { GROUP_EXPERT }
    public fun group_beneficiary() : u8 { GROUP_BENEFICIARY }
    public fun group_firm()        : u8 { GROUP_FIRM }
    public fun group_investor()    : u8 { GROUP_INVESTOR }
}
