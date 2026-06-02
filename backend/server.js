// ╔══════════════════════════════════════════════════════════════╗
// ║ DIVG Backend — server.js                                     ║
// ║ Orchestrates: SUI Move calls + Hedera HCS + Python ABM       ║
// ║ Stack matches the user's previous hackathon: Express + Node  ║
// ╚══════════════════════════════════════════════════════════════╝

import express        from 'express';
import cors           from 'cors';
import dotenv         from 'dotenv';
import { v4 as uuid } from 'uuid';
import { spawn }      from 'child_process';
import path           from 'path';
import { existsSync as fsExistsSync } from 'fs';
import { fileURLToPath } from 'url';

import { SuiClient, getFullnodeUrl }   from '@mysten/sui/client';
import { Transaction }                 from '@mysten/sui/transactions';
import { Ed25519Keypair }              from '@mysten/sui/keypairs/ed25519';
import {
  Client,
  TopicCreateTransaction,
  TopicMessageSubmitTransaction,
  TopicId,
  PrivateKey,
  AccountId,
}                                       from '@hashgraph/sdk';
import { createHash }                  from 'crypto';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);
const app        = express();
app.use(cors());
app.use(express.json({ limit: '2mb' }));

const PORT = process.env.PORT || 4000;

// ╔══════════════════════════════════════════════════════════════╗
// ║ STATE — in-memory store for live demo (replace with DB later)║
// ╚══════════════════════════════════════════════════════════════╝
const STATE = {
  validators : [],      // pool of registered validators with DIDs
  firms      : [],
  investors  : [],
  claims     : [],      // submitted claims
  rounds     : [],      // completed validation rounds
  vics       : [],      // minted VICs
  hcsTopicId : process.env.HEDERA_TOPIC_ID || null,
};

// ╔══════════════════════════════════════════════════════════════╗
// ║ SUI CLIENT                                                    ║
// ╚══════════════════════════════════════════════════════════════╝
const suiClient = new SuiClient({
  url: process.env.SUI_RPC_URL || getFullnodeUrl('testnet'),
});

const PACKAGE_ID  = process.env.SUI_PACKAGE_ID  || '';
const REGISTRY_ID = process.env.SUI_REGISTRY_ID || '';
const ADMIN_CAP   = process.env.SUI_ADMIN_CAP   || '';

let adminKeypair = null;
if (process.env.SUI_ADMIN_PRIVATE_KEY) {
  try {
    adminKeypair = Ed25519Keypair.fromSecretKey(process.env.SUI_ADMIN_PRIVATE_KEY);
    console.log('[SUI] Admin keypair loaded:', adminKeypair.toSuiAddress());
  } catch (e) {
    console.warn('[SUI] Failed to load admin keypair:', e.message);
  }
}

// ╔══════════════════════════════════════════════════════════════╗
// ║ HEDERA CLIENT                                                 ║
// ╚══════════════════════════════════════════════════════════════╝
function getHederaClient() {
  if (!process.env.HEDERA_ACCOUNT_ID || !process.env.HEDERA_PRIVATE_KEY) {
    return null;
  }
  const client = Client.forTestnet();
  const keyType = (process.env.HEDERA_KEY_TYPE || 'ECDSA').toUpperCase();
  const rawKey  = process.env.HEDERA_PRIVATE_KEY;
  const hederaKey = keyType === 'ED25519'
    ? PrivateKey.fromStringED25519(rawKey)
    : PrivateKey.fromStringECDSA(rawKey);
  client.setOperator(
    AccountId.fromString(process.env.HEDERA_ACCOUNT_ID),
    hederaKey
  );
  return client;
}

async function ensureHcsTopic() {
  if (STATE.hcsTopicId) return STATE.hcsTopicId;
  const client = getHederaClient();
  if (!client) {
    console.warn('[HEDERA] No credentials — running in simulation mode');
    STATE.hcsTopicId = `0.0.SIM-${Date.now()}`;
    return STATE.hcsTopicId;
  }
  const tx      = await new TopicCreateTransaction()
    .setTopicMemo('DIVG | Audit Trail')
    .execute(client);
  const receipt = await tx.getReceipt(client);
  STATE.hcsTopicId = receipt.topicId.toString();
  console.log('[HEDERA] Created topic:', STATE.hcsTopicId);
  client.close();
  return STATE.hcsTopicId;
}

async function logToHcs(eventType, payload) {
  await ensureHcsTopic();
  const message = JSON.stringify({
    type      : eventType,
    timestamp : new Date().toISOString(),
    ...payload,
  });
  const client = getHederaClient();
  if (!client) {
    const seq = Math.floor(Math.random() * 1e6);
    console.log(`[HCS:SIM] ${eventType} seq=${seq}`, payload);
    return { sequence: seq, simulated: true };
  }
  try {
    const tx      = await new TopicMessageSubmitTransaction({
      topicId : TopicId.fromString(STATE.hcsTopicId),
      message,
    }).execute(client);
    const receipt = await tx.getReceipt(client);
    const seq     = receipt.topicSequenceNumber?.toString() || '0';
    client.close();
    console.log(`[HCS] ${eventType} seq=${seq}`);
    return { sequence: Number(seq), simulated: false };
  } catch (e) {
    client.close();
    console.error('[HCS] Submit failed:', e.message);
    const seq = Math.floor(Math.random() * 1e6);
    return { sequence: seq, simulated: true, error: e.message };
  }
}

// ╔══════════════════════════════════════════════════════════════╗
// ║ HELPER — call Python Mesa simulation for SPP scoring         ║
// ╚══════════════════════════════════════════════════════════════╝
function runPythonABM(validators, claimTruth) {
  return new Promise((resolve, reject) => {
    const script = path.join(__dirname, 'abm_round.py');
    // Prefer project-local venv (created by scripts/setup.sh), fall back to system python3
    const venvPy = path.join(__dirname, '.venv', 'bin', 'python3');
    const pyCmd  = fsExistsSync(venvPy) ? venvPy : 'python3';
    const py     = spawn(pyCmd, [script]);
    let stdout   = '';
    let stderr   = '';
    py.stdout.on('data', d => stdout += d.toString());
    py.stderr.on('data', d => stderr += d.toString());
    py.on('close', code => {
      if (code !== 0) {
        return reject(new Error(`ABM exit ${code}: ${stderr}`));
      }
      try {
        resolve(JSON.parse(stdout));
      } catch (e) {
        reject(new Error(`ABM parse error: ${e.message}\n${stdout}`));
      }
    });
    py.stdin.write(JSON.stringify({ validators, claim_truth: claimTruth }));
    py.stdin.end();
  });
}

// ╔══════════════════════════════════════════════════════════════╗
// ║ HELPER — call SUI Move contract                              ║
// ╚══════════════════════════════════════════════════════════════╝
async function callMove(target, args) {
  if (!adminKeypair || !PACKAGE_ID) {
    console.log('[SUI:SIM] would call', target, args);
    return { simulated: true, digest: `sim-${uuid().slice(0, 8)}` };
  }
  try {
    const tx = new Transaction();
    tx.moveCall({ target, arguments: args(tx) });
    const result = await suiClient.signAndExecuteTransaction({
      signer      : adminKeypair,
      transaction : tx,
      options     : { showEffects: true, showEvents: true },
    });
    return { simulated: false, digest: result.digest, events: result.events };
  } catch (e) {
    console.error('[SUI] Call failed:', e.message);
    return { simulated: true, digest: `sim-${uuid().slice(0, 8)}`, error: e.message };
  }
}

// ╔══════════════════════════════════════════════════════════════╗
// ║ ROUTES                                                        ║
// ╚══════════════════════════════════════════════════════════════╝

// ─── Health ────────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({
    status      : 'ok',
    package_id  : PACKAGE_ID  || 'not-deployed',
    registry_id : REGISTRY_ID || 'not-deployed',
    hcs_topic   : STATE.hcsTopicId,
    sui_admin   : adminKeypair?.toSuiAddress() || null,
    counts      : {
      validators : STATE.validators.length,
      claims     : STATE.claims.length,
      vics       : STATE.vics.length,
    },
  });
});

// ─── LAYER 1: REGISTRY — register validator/firm/investor ─────
app.post('/api/registry/register', async (req, res) => {
  const { full_name, email, affiliation, group } = req.body;
  if (!full_name || !email || !group) {
    return res.status(400).json({ error: 'full_name, email, group required' });
  }

  // Generate DID: did:divg:<sha256(name+email)>
  const idHash = createHash('sha256')
    .update(`${full_name}|${email}`)
    .digest('hex')
    .slice(0, 16);
  const did = `did:divg:${idHash}`;

  // Simulated SUI address (deterministic from DID)
  const suiAddr = `0x${createHash("sha256").update(did).digest("hex")}`;

  const entity = {
    address       : suiAddr,
    did,
    full_name,
    email,
    affiliation   : affiliation || 'Independent',
    group,
    reputation    : 0.4 + Math.random() * 0.2,  // U[0.4, 0.6]
    active        : true,
    registered_at : new Date().toISOString(),
  };

  // Route to appropriate pool
  if (group === 'firm')      STATE.firms.push(entity);
  else if (group === 'investor') STATE.investors.push(entity);
  else                       STATE.validators.push(entity);

  // Mirror to SUI on-chain (if configured)
  const groupCode = { employee: 0, expert: 1, beneficiary: 2, firm: 3, investor: 4 }[group] ?? 0;
  const suiResult = await callMove(
    `${PACKAGE_ID}::divg::register_entity`,
    (tx) => [
      tx.object(ADMIN_CAP),
      tx.object(REGISTRY_ID),
      tx.pure.address(suiAddr),
      tx.pure.string(full_name),
      tx.pure.string(affiliation || 'Independent'),
      tx.pure.string(did),
      tx.pure.u8(groupCode),
    ]
  );

  // Log to Hedera HCS
  const hcsResult = await logToHcs('entity_registered', { did, group, sui_addr: suiAddr });

  res.json({ entity, sui: suiResult, hcs: hcsResult });
});

// ─── LAYER 1: List all entities ────────────────────────────────
app.get('/api/registry', (req, res) => {
  res.json({
    validators : STATE.validators,
    firms      : STATE.firms,
    investors  : STATE.investors,
  });
});

// ─── LAYER 2: CLAIM — firm submits impact claim ───────────────
app.post('/api/claim/submit', async (req, res) => {
  const { firm_did, description, claim_data } = req.body;
  if (!firm_did || !description) {
    return res.status(400).json({ error: 'firm_did and description required' });
  }
  const firm = STATE.firms.find(f => f.did === firm_did);
  if (!firm) return res.status(404).json({ error: 'firm DID not found' });

  const claim_hash = createHash('sha256')
    .update(JSON.stringify({ description, claim_data, ts: Date.now() }))
    .digest('hex');

  const claim = {
    claim_id     : uuid(),
    firm_did,
    firm_name    : firm.full_name,
    description,
    claim_data   : claim_data || {},
    claim_hash,
    submitted_at : new Date().toISOString(),
    status       : 'pending',
  };
  STATE.claims.push(claim);

  const suiResult = await callMove(
    `${PACKAGE_ID}::divg::submit_claim`,
    (tx) => [
      tx.object(ADMIN_CAP),
      tx.object(REGISTRY_ID),
      tx.pure.address(firm.address),
      tx.pure.vector('u8', Array.from(Buffer.from(claim_hash, 'hex'))),
      tx.pure.string(description),
    ]
  );
  const hcsResult = await logToHcs('claim_submitted', {
    claim_id   : claim.claim_id,
    firm_did,
    claim_hash,
  });

  res.json({ claim, sui: suiResult, hcs: hcsResult });
});

app.get('/api/claims', (req, res) => res.json({ claims: STATE.claims }));

// ─── LAYER 3 & 4: VALIDATION ROUND — stratified panel + SPP ───
// This is the main pipeline: VRF-style selection → Mesa ABM → on-chain mint
app.post('/api/round/run', async (req, res) => {
  const { claim_id, panel_size = 30, ground_truth = null } = req.body;
  const claim = STATE.claims.find(c => c.claim_id === claim_id);
  if (!claim) return res.status(404).json({ error: 'claim not found' });

  // ── Step 1: Stratified sampling from validator pool ──
  // Composition: 30% employees, 30% experts, 40% beneficiaries
  const byGroup = {
    employee    : STATE.validators.filter(v => v.group === 'employee'),
    expert      : STATE.validators.filter(v => v.group === 'expert'),
    beneficiary : STATE.validators.filter(v => v.group === 'beneficiary'),
  };
  const targets = {
    employee    : Math.floor(panel_size * 0.30),
    expert      : Math.floor(panel_size * 0.30),
    beneficiary : panel_size - Math.floor(panel_size * 0.30) - Math.floor(panel_size * 0.30),
  };

  // Augment pool with simulated validators if real pool is too small
  function ensureGroup(group, target) {
    const pool = byGroup[group];
    while (pool.length < target) {
      const idx     = pool.length + 1;
      const fake_id = createHash('sha256').update(`sim-${group}-${idx}-${claim_id}`).digest('hex').slice(0, 16);
      pool.push({
        address       : `0x${createHash("sha256").update(fake_id).digest("hex")}`,
        did           : `did:divg:sim:${fake_id}`,
        full_name     : `Simulated ${group} ${idx}`,
        affiliation   : 'Simulated',
        group,
        reputation    : 0.4 + Math.random() * 0.2,
        active        : true,
        simulated     : true,
        registered_at : new Date().toISOString(),
      });
    }
  }
  ensureGroup('employee',    targets.employee);
  ensureGroup('expert',      targets.expert);
  ensureGroup('beneficiary', targets.beneficiary);

  // VRF-style shuffle and pick
  function shuffle(arr) { return [...arr].sort(() => Math.random() - 0.5); }
  const panel = [
    ...shuffle(byGroup.employee).slice(0,    targets.employee),
    ...shuffle(byGroup.expert).slice(0,      targets.expert),
    ...shuffle(byGroup.beneficiary).slice(0, targets.beneficiary),
  ];

  // ── Step 2: Determine ground truth ω (random if not provided) ──
  const omega = ground_truth !== null ? ground_truth : (Math.random() < 0.7 ? 1 : 0);

  // ── Step 3: Run Python Mesa ABM for the round ──
  const validatorsForABM = panel.map(v => ({
    address       : v.address,
    did           : v.did,
    group         : v.group,
    reputation    : v.reputation,
    p_signal      : v.group === 'expert' ? 0.80 : 0.70,
    honesty_prob  : 0.8,    // baseline 80% honest
    cost          : 0.1,
  }));

  let abm;
  try {
    abm = await runPythonABM(validatorsForABM, omega);
  } catch (e) {
    return res.status(500).json({ error: 'ABM failed', detail: e.message });
  }

  // ── Step 4: Log round to Hedera HCS ──
  const hcsResult = await logToHcs('validation_round_complete', {
    claim_id,
    panel_size : panel.length,
    omega,
    d_final    : abm.d_final,
    conf       : abm.confidence,
    s_agg      : abm.s_agg,
    round_count: abm.round_count,
  });

  // ── Step 5: Mint VIC on SUI (unconditional) ──
  const suiResult = await callMove(
    `${PACKAGE_ID}::divg::mint_vic`,
    (tx) => [
      tx.object(ADMIN_CAP),
      tx.pure.string(claim.firm_did),
      tx.pure.vector('u8', Array.from(Buffer.from(claim.claim_hash, 'hex'))),
      tx.pure.u8(abm.d_final),
      tx.pure.u64(Math.round(abm.confidence  * 1000)),
      tx.pure.u64(Math.round(abm.s_agg       * 1000)),
      tx.pure.u64(panel.length),
      tx.pure.u64(abm.validators_approved),
      tx.pure.u8(abm.round_count),
      tx.pure.string(STATE.hcsTopicId || 'no-topic'),
      tx.pure.u64(hcsResult.sequence),
    ]
  );

  // ── Step 6: Persist round + VIC in memory ──
  const round = {
    round_id  : uuid(),
    claim_id,
    panel,
    omega,
    abm,
    sui       : suiResult,
    hcs       : hcsResult,
    timestamp : new Date().toISOString(),
  };
  STATE.rounds.push(round);

  const vic = {
    vic_id              : uuid(),
    claim_id,
    firm_did            : claim.firm_did,
    d_final             : abm.d_final,
    confidence          : abm.confidence,
    s_agg               : abm.s_agg,
    total_validators    : panel.length,
    validators_approved : abm.validators_approved,
    round_count         : abm.round_count,
    hedera_topic_id     : STATE.hcsTopicId,
    hedera_sequence     : hcsResult.sequence,
    sui_digest          : suiResult.digest,
    minted_at           : new Date().toISOString(),
    // ── Verification graph (pseudonymous): DID + group + vote only.
    //    No participant names are stored — the DID is the identifier. ──
    graph_validators    : (abm.validators || []).map(v => ({
      did   : v.did,
      group : v.group,
      vote  : v.vote,
    })),
    // Investor advisory signals accumulate here (score only, no identity).
    graph_sigmas        : [],
  };
  STATE.vics.push(vic);
  claim.status = 'complete';
  claim.vic_id = vic.vic_id;

  res.json({ round, vic, abm });
});

app.get('/api/rounds', (req, res) => res.json({ rounds: STATE.rounds }));


// ─── RESET — clear sandbox state (keeps Hedera topic) ─────────
app.post('/api/reset', (req, res) => {
  STATE.validators = [];
  STATE.firms      = [];
  STATE.investors  = [];
  STATE.claims     = [];
  STATE.rounds     = [];
  STATE.vics       = [];
  res.json({ ok: true, message: 'Sandbox reset' });
});


// ─── LAYER 5: VIC + INVESTOR ADVISORY ─────────────────────────
app.get('/api/vics', (req, res) => res.json({ vics: STATE.vics }));

app.get('/api/vic/:id', (req, res) => {
  const vic = STATE.vics.find(v => v.vic_id === req.params.id);
  if (!vic) return res.status(404).json({ error: 'VIC not found' });
  res.json({ vic });
});

app.post('/api/investor/advisory', (req, res) => {
  const { vic_id, theta } = req.body;
  const vic = STATE.vics.find(v => v.vic_id === vic_id);
  if (!vic) return res.status(404).json({ error: 'VIC not found' });
  // σ(C) = 1 if D_final=1 AND Conf(c) ≥ θ
  const sigma = (vic.d_final === 1 && vic.confidence >= theta) ? 1 : 0;
  // Record the advisory signal on the VIC graph — score + threshold only,
  // no investor identity is stored (investors stay pseudonymous).
  if (!vic.graph_sigmas) vic.graph_sigmas = [];
  vic.graph_sigmas.push({ sigma, theta, at: new Date().toISOString() });
  res.json({
    vic_id,
    theta,
    sigma,
    d_final     : vic.d_final,
    confidence  : vic.confidence,
    advisory    : sigma === 1 ? 'PROCEED' : 'CAUTION',
  });
});

// ─── SEED DATA — load Winnow/MSM case study + validator pool ──
app.post('/api/seed/winnow', async (req, res) => {
  const groupCode = { employee: 0, expert: 1, beneficiary: 2, firm: 3, investor: 4 };
  // helper: deterministic 32-byte (64 hex) SUI address from a seed string
  const addrFrom = (s) => `0x${createHash('sha256').update(s).digest('hex')}`;

  const results = [];

  // Register Winnow as a firm — ON-CHAIN
  if (!STATE.firms.find(f => f.full_name === 'Winnow')) {
    const winnowDid  = `did:divg:${createHash('sha256').update('Winnow|impact@winnowsolutions.com').digest('hex').slice(0, 16)}`;
    const winnowAddr = addrFrom(winnowDid);
    const winnow = {
      address       : winnowAddr,
      did           : winnowDid,
      full_name     : 'Winnow',
      email         : 'impact@winnowsolutions.com',
      affiliation   : 'MSM Fund portfolio company',
      group         : 'firm',
      reputation    : 0.5,
      active        : true,
      registered_at : new Date().toISOString(),
    };
    STATE.firms.push(winnow);
    const r = await callMove(`${PACKAGE_ID}::divg::register_entity`, (tx) => [
      tx.object(ADMIN_CAP),
      tx.object(REGISTRY_ID),
      tx.pure.address(winnowAddr),
      tx.pure.string('Winnow'),
      tx.pure.string('MSM Fund portfolio company'),
      tx.pure.string(winnowDid),
      tx.pure.u8(groupCode.firm),
    ]);
    await logToHcs('entity_registered', { did: winnowDid, group: 'firm', sui_addr: winnowAddr });
    results.push({ name: 'Winnow', sui: r.digest });
  }

  // Pre-seed real-shaped validators across groups — ON-CHAIN
  const seed = [
    { name: 'Marc Zornes',    email: 'mz@winnow.com',        group: 'employee',    affiliation: 'Winnow CEO' },
    { name: 'Kevin Duffy',    email: 'kd@winnow.com',        group: 'employee',    affiliation: 'Winnow Engineering' },
    { name: 'Tessa Clarke',   email: 'tc@msm.vc',            group: 'expert',      affiliation: 'OLIO CEO, MSM Venture Partner' },
    { name: 'Henry Wigan',    email: 'hw@msm.vc',            group: 'expert',      affiliation: 'MSM Co-founder' },
    { name: 'Chef Antonio',   email: 'antonio@ikea.example', group: 'beneficiary', affiliation: 'IKEA Restaurant Manager' },
    { name: 'Chef Maria',     email: 'maria@hilton.example', group: 'beneficiary', affiliation: 'Hilton F&B Manager' },
  ];
  for (const s of seed) {
    if (STATE.validators.find(v => v.email === s.email)) continue;
    const idHash = createHash('sha256').update(`${s.name}|${s.email}`).digest('hex').slice(0, 16);
    const did    = `did:divg:${idHash}`;
    const addr   = addrFrom(did);
    STATE.validators.push({
      address       : addr,
      did, full_name : s.name, email: s.email, affiliation: s.affiliation,
      group         : s.group,
      reputation    : 0.4 + Math.random() * 0.2,
      active        : true,
      registered_at : new Date().toISOString(),
    });
    await callMove(`${PACKAGE_ID}::divg::register_entity`, (tx) => [
      tx.object(ADMIN_CAP),
      tx.object(REGISTRY_ID),
      tx.pure.address(addr),
      tx.pure.string(s.name),
      tx.pure.string(s.affiliation),
      tx.pure.string(did),
      tx.pure.u8(groupCode[s.group]),
    ]);
  }
  res.json({
    seeded: true,
    onchain: results,
    counts: { firms: STATE.firms.length, validators: STATE.validators.length }
  });
});

// ╔══════════════════════════════════════════════════════════════╗
// ║ START                                                         ║
// ╚══════════════════════════════════════════════════════════════╝
app.listen(PORT, () => {
  console.log('╔══════════════════════════════════════════╗');
  console.log(`║ DIVG Backend live on port ${PORT}              ║`);
  console.log('║ Endpoints:                                ║');
  console.log('║   POST /api/registry/register             ║');
  console.log('║   POST /api/claim/submit                  ║');
  console.log('║   POST /api/round/run                     ║');
  console.log('║   POST /api/investor/advisory             ║');
  console.log('║   GET  /api/vics                          ║');
  console.log('║   POST /api/seed/winnow                   ║');
  console.log('╚══════════════════════════════════════════╝');
});
