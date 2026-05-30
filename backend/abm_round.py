#!/usr/bin/env python3
"""
DIVG ABM round runner — Compact SPP scoring.

Called from Express server via stdin/stdout JSON pipe.

INPUT (stdin):
{
  "validators": [
    {"address": "0x...", "did": "did:divg:...", "group": "expert",
     "reputation": 0.51, "p_signal": 0.80, "honesty_prob": 0.8, "cost": 0.1},
    ...
  ],
  "claim_truth": 1
}

OUTPUT (stdout):
{
  "d_final": 1,
  "confidence": 0.915,
  "s_agg": 0.846,
  "validators_approved": 25,
  "round_count": 1,
  "agreement_A": 0.833,
  "diversity_Psi": 0.956,
  "path_T": 1.0,
  "validators": [
    {"did": "...", "vote": 1, "prior": 0.75, "shadow": 0.85,
     "ref_did": "...", "ref_vote": 1, "score": 0.878},
    ...
  ],
  "groups": {
    "employee": {"mu": 0.8, "decision": 1, "count": 10},
    "expert":   {"mu": 0.8, "decision": 1, "count": 10},
    "beneficiary": {"mu": 0.9, "decision": 1, "count": 10}
  }
}
"""

import sys
import json
import random
import numpy as np

# ═══ CONSTANTS (match Move contract) ═══════════════════════════════
DELTA   = 0.2     # Compact SPP mechanism parameter
TAU_G   = 0.5     # group approval threshold (baseline)
TAU_ARB = 0.5     # arbitration threshold
ALPHA   = 0.4     # confidence weight: agreement
BETA    = 0.4     # confidence weight: diversity
GAMMA   = 0.2     # confidence weight: path stability


def rq_score(y: float, omega: int) -> float:
    """Binary quadratic scoring rule Rq."""
    if omega == 1:
        return 2 * y - y * y
    else:
        return 1 - y * y


def compute_shadow(prior: float, vote: int) -> float:
    """shadow = (1 - 2δ)·y + 2δ·x"""
    return max(0.0, min(1.0, (1 - 2 * DELTA) * prior + 2 * DELTA * vote))


def run_round(validators_in: list, claim_truth: int) -> dict:
    # ── Stage 1: Each validator reports prior belief y_i ──
    # Approximated as p_signal + Gaussian noise (mirrors thesis)
    for v in validators_in:
        noise = np.random.normal(0, 0.05)
        v['prior'] = float(np.clip(v['p_signal'] + noise, 0.01, 0.99))

    # ── Stage 2: Each validator receives signal s_i, then votes x_i ──
    for v in validators_in:
        # Private signal — informative with prob p_signal
        if random.random() < v['p_signal']:
            v['signal'] = claim_truth
        else:
            v['signal'] = 1 - claim_truth
        # Honest validators report s_i; dishonest report 1-s_i
        if random.random() < v['honesty_prob']:
            v['vote'] = v['signal']
        else:
            v['vote'] = 1 - v['signal']

    # ── Group aggregation ──
    groups_data = {}
    for g in ['employee', 'expert', 'beneficiary']:
        votes_g = [v['vote'] for v in validators_in if v['group'] == g]
        if votes_g:
            mu_g = sum(votes_g) / len(votes_g)
            groups_data[g] = {
                'mu'       : round(mu_g, 4),
                'decision' : 1 if mu_g >= TAU_G else 0,
                'count'    : len(votes_g),
            }
        else:
            groups_data[g] = {'mu': 0.0, 'decision': 0, 'count': 0}

    # ── Global unanimity rule: D = ∏_g 1(μ_g ≥ τ_g) ──
    d_primary    = 1 if all(g['decision'] == 1 for g in groups_data.values()) else 0
    groups_pass  = sum(g['decision'] for g in groups_data.values())

    # ── Secondary validation cycle (if partial agreement) ──
    if 1 <= groups_pass <= 2:
        # Reputation-weighted arbitration with top-K validators
        sorted_v = sorted(validators_in, key=lambda x: x['reputation'], reverse=True)
        k        = max(3, int(len(validators_in) * 0.6))
        v_arb    = sorted_v[:k]
        w_sum    = sum(v['reputation'] * v['vote'] for v in v_arb)
        w_tot    = sum(v['reputation'] for v in v_arb)
        d_final  = 1 if (w_tot > 0 and w_sum / w_tot >= TAU_ARB) else 0
        round_count = 2
        path_T   = 0.5
    else:
        d_final     = d_primary
        round_count = 1
        path_T      = 1.0

    # ── Confidence score: Conf(c) = αA + βΨ + γT ──
    all_votes = [v['vote'] for v in validators_in]
    A         = sum(all_votes) / len(all_votes) if all_votes else 0
    psi       = 1 - (1/3) * sum(abs(groups_data[g]['mu'] - A) for g in groups_data)
    confidence = ALPHA * A + BETA * psi + GAMMA * path_T

    # ── Compact SPP scoring per validator (bilateral, random reference) ──
    output_validators = []
    for v in validators_in:
        candidates = [u for u in validators_in if u['address'] != v['address']]
        ref        = random.choice(candidates)
        shadow     = compute_shadow(v['prior'], v['vote'])
        rq         = rq_score(shadow, ref['vote'])
        score      = rq - v['cost']
        output_validators.append({
            'did'       : v['did'],
            'group'     : v['group'],
            'prior'     : round(v['prior'], 4),
            'signal'    : v['signal'],
            'vote'      : v['vote'],
            'shadow'    : round(shadow, 4),
            'ref_did'   : ref['did'],
            'ref_vote'  : ref['vote'],
            'rq'        : round(rq, 4),
            'score'     : round(score, 4),
            'aligned'   : 1 if v['vote'] == d_final else 0,
        })

    # ── S_agg: reputation-weighted sentiment ──
    w_tot = sum(v['reputation'] for v in validators_in)
    s_agg = sum(v['reputation'] * v['vote'] for v in validators_in) / w_tot if w_tot > 0 else 0.5

    validators_approved = sum(1 for v in validators_in if v['vote'] == 1)

    return {
        'd_final'             : d_final,
        'confidence'          : round(confidence, 4),
        's_agg'               : round(s_agg, 4),
        'validators_approved' : validators_approved,
        'round_count'         : round_count,
        'agreement_A'         : round(A, 4),
        'diversity_Psi'       : round(psi, 4),
        'path_T'              : path_T,
        'groups'              : groups_data,
        'validators'          : output_validators,
    }


if __name__ == '__main__':
    raw    = sys.stdin.read()
    data   = json.loads(raw)
    result = run_round(data['validators'], int(data['claim_truth']))
    print(json.dumps(result))
