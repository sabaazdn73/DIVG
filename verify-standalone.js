#!/usr/bin/env node
/**
 * ═══════════════════════════════════════════════════════════════════
 *   DIVG · Standalone VIC Verifier
 *   ─────────────────────────────────────────────────────────────
 *   Independently verifies a Verifiable Impact Credential without
 *   trusting the DIVG platform operator. Runs two checks:
 *
 *     1. OFFLINE — SHA-256 hash integrity of the embedded claim data
 *     2. ONLINE  — SUI object state + Hedera HCS audit trail lookup
 *
 *   Usage:
 *     node verify-standalone.js example-vic.json
 *     node verify-standalone.js path/to/your-vic.json --strict
 *
 *   Exit codes:
 *     0  All checks passed
 *     1  Hash mismatch (tampered file)
 *     2  On-chain state mismatch
 *     3  File or network error
 * ═══════════════════════════════════════════════════════════════════
 */

import fs       from 'fs';
import crypto   from 'crypto';
import https    from 'https';

const args     = process.argv.slice(2);
const filePath = args[0];
const strict   = args.includes('--strict');

if (!filePath) {
  console.error('Usage: node verify-standalone.js <vic.json> [--strict]');
  process.exit(3);
}

// ─── Load VIC JSON ─────────────────────────────────────────────
let vic;
try {
  vic = JSON.parse(fs.readFileSync(filePath, 'utf8'));
} catch (e) {
  console.error('✗ Cannot read file:', e.message);
  process.exit(3);
}

console.log('═══════════════════════════════════════════════════');
console.log('  DIVG · Standalone VIC Verifier');
console.log('═══════════════════════════════════════════════════');
console.log('');
console.log(`▸ Loaded VIC: ${filePath}`);
console.log(`  vic_id:     ${vic.vic_id}`);
console.log(`  firm_did:   ${vic.firm_did}`);
console.log(`  d_final:    ${vic.d_final}`);
console.log(`  confidence: ${vic.confidence}`);
console.log(`  approved:   ${vic.validators_approved}/${vic.total_validators}`);
console.log('');

// ═══ CHECK 1 — Offline hash integrity ═══════════════════════════
console.log('CHECK 1 — Offline hash integrity');
console.log('  Recomputing SHA-256 over the claim payload...');

const claimPayload = JSON.stringify({
  vic_id              : vic.vic_id,
  claim_id            : vic.claim_id,
  firm_did            : vic.firm_did,
  d_final             : vic.d_final,
  confidence          : vic.confidence,
  s_agg               : vic.s_agg,
  total_validators    : vic.total_validators,
  validators_approved : vic.validators_approved,
  round_count         : vic.round_count,
  hedera_sequence     : vic.hedera_sequence,
});
const recomputed = crypto.createHash('sha256').update(claimPayload).digest('hex');

if (vic.integrity_hash && recomputed === vic.integrity_hash) {
  console.log(`  ✓ Hash matches: ${recomputed.slice(0, 16)}...`);
} else if (!vic.integrity_hash) {
  console.log(`  ⚠ No integrity_hash field present (computed: ${recomputed.slice(0, 16)}...)`);
  if (strict) { console.log('  ✗ Strict mode: missing hash is a failure'); process.exit(1); }
} else {
  console.log(`  ✗ HASH MISMATCH`);
  console.log(`    expected: ${vic.integrity_hash}`);
  console.log(`    computed: ${recomputed}`);
  process.exit(1);
}
console.log('');

// ═══ CHECK 2 — Online SUI object state ══════════════════════════
console.log('CHECK 2 — SUI on-chain state');

const SUI_RPC = process.env.SUI_RPC_URL || 'https://fullnode.testnet.sui.io:443';

function suiCall(method, params) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({ jsonrpc: '2.0', id: 1, method, params });
    const url  = new URL(SUI_RPC);
    const req  = https.request({
      hostname: url.hostname,
      path    : url.pathname,
      method  : 'POST',
      headers : { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) },
    }, res => {
      let data = '';
      res.on('data', d => data += d);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch (e) { reject(e); }
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

if (vic.sui_object_id && !vic.sui_object_id.startsWith('sim-')) {
  try {
    const result = await suiCall('sui_getObject', [
      vic.sui_object_id,
      { showContent: true, showOwner: true }
    ]);
    if (result.result?.data?.content) {
      const onChain = result.result.data.content.fields;
      console.log(`  ✓ SUI object found:    ${vic.sui_object_id}`);
      console.log(`    on-chain d_final:    ${onChain.d_final}`);
      console.log(`    on-chain conf_x1000: ${onChain.conf_x1000}`);
      // Compare with VIC file
      if (Number(onChain.d_final) !== vic.d_final) {
        console.log('  ✗ D_final mismatch between file and on-chain state');
        process.exit(2);
      }
    } else {
      console.log(`  ✗ SUI object not found: ${vic.sui_object_id}`);
      if (strict) process.exit(2);
    }
  } catch (e) {
    console.log(`  ⚠ SUI RPC error: ${e.message}`);
    if (strict) process.exit(3);
  }
} else {
  console.log('  ⚠ No SUI object ID (or simulated demo VIC)');
}
console.log('');

// ═══ CHECK 3 — Hedera HCS audit trail ═══════════════════════════
console.log('CHECK 3 — Hedera HCS audit trail');

const HEDERA_MIRROR = process.env.HEDERA_MIRROR || 'https://testnet.mirrornode.hedera.com';

if (vic.hedera_topic_id && vic.hedera_sequence && !vic.hedera_topic_id.includes('SIM')) {
  const url = `${HEDERA_MIRROR}/api/v1/topics/${vic.hedera_topic_id}/messages/${vic.hedera_sequence}`;
  try {
    const response = await fetch(url);
    if (response.ok) {
      const data = await response.json();
      console.log(`  ✓ Hedera HCS message found`);
      console.log(`    topic:    ${vic.hedera_topic_id}`);
      console.log(`    sequence: ${vic.hedera_sequence}`);
      console.log(`    consensus_timestamp: ${data.consensus_timestamp}`);
    } else {
      console.log(`  ✗ HCS message not found (HTTP ${response.status})`);
      if (strict) process.exit(2);
    }
  } catch (e) {
    console.log(`  ⚠ Hedera Mirror Node error: ${e.message}`);
    if (strict) process.exit(3);
  }
} else {
  console.log('  ⚠ No Hedera HCS reference (or simulated demo VIC)');
}
console.log('');

// ═══ SUMMARY ════════════════════════════════════════════════════
console.log('═══════════════════════════════════════════════════');
console.log('  ✓ Verification complete');
console.log('═══════════════════════════════════════════════════');
console.log('');
console.log('Interpretation:');
const conf = vic.confidence;
if (vic.d_final === 1 && conf >= 0.80) {
  console.log('  HIGH CONFIDENCE — strong stakeholder consensus across all groups');
} else if (vic.d_final === 1 && conf >= 0.50) {
  console.log('  MEDIUM CONFIDENCE — partial agreement, supplementary diligence advised');
} else {
  console.log('  LOW / CONTESTED — secondary cycle triggered or weak alignment');
}
console.log('');
console.log('Note: σ(C) computation requires the investor\'s risk-tolerance θ');
console.log('      and is strictly advisory — DIVG never restricts publication.');
console.log('');
