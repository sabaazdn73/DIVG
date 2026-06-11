// ╔══════════════════════════════════════════════════════════════╗
// ║ DIVG Backend — server.js                                     ║
// ║ Orchestrates: SUI Move calls + Hedera HCS + Python ABM       ║
// ║ + Walrus decentralized storage                               ║
// ╚══════════════════════════════════════════════════════════════╝
import { scorePortfolio } from './lib/impact_scoring.js';
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
import { decodeSuiPrivateKey }         from '@mysten/sui/cryptography';
import {
  Client,
  TopicCreateTransaction,
  TopicMessageSubmitTransaction,
  TopicId,
  PrivateKey,
  AccountId,
}                                       from '@hashgraph/sdk';
import { createHash }                  from 'crypto';
import { Resend }                      from 'resend';


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
  validators           : [],
  firms                : [],
  investors            : [],
  claims               : [],
  rounds               : [],
  vics                 : [],
  pendingVerifications : {}, 
  hcsTopicId           : process.env.HEDERA_TOPIC_ID || null,
  activeRounds         : {}, // Tracks live voting sessions
};

// ─── ENHANCED LIVE VOTING ENDPOINTS ────────────────────────

// 1. Initiate a round (Invite the panel)
app.post('/api/round/initiate', (req, res) => {
  const { claim_id, panel_size = 30 } = req.body;
  const round_id = uuid();
  
  // Stratified sampling logic to generate the panel
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

  function ensureGroup(group, target) {
    const pool = byGroup[group];
    while (pool.length < target) {
      const idx     = pool.length + 1;
      const fake_id = createHash('sha256').update(`sim-${group}-${idx}-${claim_id}`).digest('hex').slice(0, 16);
      pool.push({
        address       : `0x${createHash("sha256").update(fake_id).digest("hex")}`,
        did           : `did:divg:sim:${fake_id}`,
        full_name     : `Simulated ${group} ${idx}`,
        email         : `simulated${idx}@example.com`,
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

  function shuffle(arr) { return [...arr].sort(() => Math.random() - 0.5); }
  const panel = [
    ...shuffle(byGroup.employee).slice(0,    targets.employee),
    ...shuffle(byGroup.expert).slice(0,      targets.expert),
    ...shuffle(byGroup.beneficiary).slice(0, targets.beneficiary),
  ];
  
  // Save the round with panel details so we know who is authorized to vote
  STATE.activeRounds[round_id] = {
    claim_id,
    panel, 
    votes: [],
    status: 'open'
  };

  // Mocking the "Email Invite" for your demo
  panel.forEach(v => {
    console.log(`[EMAIL] Simulated invite sent to ${v.email}: Vote on Claim ${claim_id}`);
  });
  
  res.json({ round_id, panel });
});

// 2. Submit a vote
app.post('/api/round/vote', async (req, res) => {
  const { round_id, did, signal, vote } = req.body;
  const round = STATE.activeRounds[round_id];
  
  if (!round || round.status !== 'open') return res.status(400).json({ error: 'Round closed' });
  
  // Security check: Only allow those in the selected panel to vote
  const isAuthorized = round.panel.find(v => v.did === did);
  if (!isAuthorized) return res.status(403).json({ error: 'Validator not selected for this round' });

  // Enforce one vote per DID (matches the "one email = one validator" claim).
  if (round.votes.find(v => v.did === did)) {
    return res.status(409).json({ error: 'This validator has already voted in this round' });
  }

  round.votes.push({ did, signal, vote, timestamp: new Date().toISOString() });

  res.json({ success: true, count: round.votes.length, totalRequired: round.panel.length });
});

// 3. Finalize a live round: turn the REAL collected votes into a minted VIC.
//    Runs the same SPP/ABM scoring used by the simulated path, but seeds it with
//    the actual votes cast by the panel, then mints via mintVicFromAbm().
app.post('/api/round/finalize', async (req, res) => {
  const { round_id, ground_truth = null } = req.body;
  const round = STATE.activeRounds[round_id];
  if (!round) return res.status(404).json({ error: 'Round not found' });
  if (round.status !== 'open') return res.status(400).json({ error: 'Round already finalized' });
  if (round.votes.length === 0) return res.status(400).json({ error: 'No votes have been cast yet' });

  const claim = STATE.claims.find(c => c.claim_id === round.claim_id);
  if (!claim) return res.status(404).json({ error: 'Claim for this round not found' });

  // Build the ABM validator list from the real votes. Each voter's cast vote
  // is treated as their signal (honesty_prob = 1) so the mechanism scores the
  // votes actually submitted rather than re-simulating them.
  const didToPanel = Object.fromEntries(round.panel.map(v => [v.did, v]));
  const validatorsForABM = round.votes.map(vote => {
    const p = didToPanel[vote.did] || {};
    return {
      address      : p.address || vote.did,
      did          : vote.did,
      group        : p.group || 'expert',
      reputation   : p.reputation ?? 0.5,
      p_signal     : typeof vote.signal === 'number' ? Math.max(0.01, Math.min(0.99, vote.signal)) : 0.7,
      honesty_prob : 1.0,           // they reported their real vote
      cost         : 0.1,
      forced_vote  : vote.vote,     // not used by the engine, kept for traceability
    };
  });

  const omega = ground_truth !== null ? Number(ground_truth) : (Math.random() < 0.7 ? 1 : 0);

  let abm;
  try {
    abm = await runPythonABM(validatorsForABM, omega);
  } catch (e) {
    return res.status(500).json({ error: 'ABM failed', detail: e.message });
  }

  round.status = 'closed';
  const { vic } = await mintVicFromAbm({ claim, panel: round.panel, omega, abm });

  res.json({ finalized: true, round_id, vic, abm });
});
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
    // FIX: Decode the suiprivkey1... format correctly
    const { secretKey } = decodeSuiPrivateKey(process.env.SUI_ADMIN_PRIVATE_KEY);
    adminKeypair = Ed25519Keypair.fromSecretKey(secretKey);
    console.log('[SUI] Admin keypair loaded:', adminKeypair.toSuiAddress());
  } catch (e) {
    console.warn('[SUI] Failed to load admin keypair:', e.message);
  }
}

// ╔══════════════════════════════════════════════════════════════╗
// ║ WALRUS — decentralized blob storage (Sui-native)             ║
// ╚══════════════════════════════════════════════════════════════╝
const WALRUS_PUBLISHER  = process.env.WALRUS_PUBLISHER  || 'https://publisher.walrus-testnet.walrus.space';
const WALRUS_AGGREGATOR = process.env.WALRUS_AGGREGATOR || 'https://aggregator.walrus-testnet.walrus.space';

async function storeOnWalrus(obj) {
  try {
    const body = JSON.stringify(obj);
    const resp = await fetch(`${WALRUS_PUBLISHER}/v1/blobs?epochs=47`, {
      method  : 'PUT',
      headers : { 'Content-Type': 'application/json' },
      body,
    });
    if (!resp.ok) {
      console.warn('[WALRUS] store failed:', resp.status);
      return null;
    }
    const data = await resp.json();
    const blobId =
      data?.newlyCreated?.blobObject?.blobId ||
      data?.alreadyCertified?.blobId ||
      null;
    if (blobId) console.log('[WALRUS] stored blob:', blobId);
    return blobId ? { blobId, raw: data } : null;
  } catch (e) {
    console.warn('[WALRUS] store error:', e.message);
    return null;
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
// ║ HELPER — call SUI Move contract (WITH RETRY FIX)             ║
// ╚══════════════════════════════════════════════════════════════╝
async function callMove(target, args, retries = 3) {
  if (!adminKeypair || !PACKAGE_ID) {
    console.log('[SUI:SIM] would call', target, args);
    return { simulated: true, digest: `sim-${uuid().slice(0, 8)}` };
  }
  
  for (let i = 0; i < retries; i++) {
    try {
      const tx = new Transaction();
      tx.setGasBudget(100000000); 
      tx.moveCall({ target, arguments: args(tx) });
      const result = await suiClient.signAndExecuteTransaction({
        signer      : adminKeypair,
        transaction : tx,
        options     : { showEffects: true, showEvents: true },
      });
      return { simulated: false, digest: result.digest, events: result.events };
    } catch (e) {
      if (e.message.includes('unavailable for consumption') && i < retries - 1) {
        console.warn(`[SUI] Version conflict (Tx too fast). Retrying... (${i + 1}/${retries})`);
        await new Promise(r => setTimeout(r, 1500)); // Wait 1.5 seconds to let the chain sync
        continue;
      }
      console.error('[SUI] Call failed:', e.message);
      return { simulated: true, digest: `sim-${uuid().slice(0, 8)}`, error: e.message };
    }
  }
}

// ╔══════════════════════════════════════════════════════════════╗
// ║ HELPER — registration / anti-sybil validation                ║
// ╚══════════════════════════════════════════════════════════════╝
function normalizeAlnum(s) {
  return String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

function emailDomainSLD(email) {
  const dom   = String(email || '').split('@')[1]?.toLowerCase() || '';
  const parts = dom.split('.').filter(Boolean);
  return parts.length >= 2 ? parts[parts.length - 2] : dom;
}

function firmEmailMatchesName(firmName, email) {
  const sld  = normalizeAlnum(emailDomainSLD(email));
  const name = normalizeAlnum(firmName);
  if (!sld || !name) return false;
  if (sld.includes(name) || name.includes(sld)) return true;
  const tokens = String(firmName).toLowerCase().split(/[^a-z0-9]+/).filter(t => t.length >= 3);
  return tokens.some(t => sld.includes(t) || t.includes(sld));
}

function findFirmByName(name) {
  const n = normalizeAlnum(name);
  if (!n) return null;
  return STATE.firms.find(f => normalizeAlnum(f.full_name) === n) || null;
}

function emailInUse(email) {
  const e = String(email || '').toLowerCase();
  if (!e) return false;
  return [...STATE.firms, ...STATE.validators, ...STATE.investors]
    .some(x => String(x.email || '').toLowerCase() === e);
}

function emailIsFirmMain(email) {
  const e = String(email || '').toLowerCase();
  if (!e) return false;
  return STATE.firms.some(f => String(f.email || '').toLowerCase() === e);
}

function validateRegistration({ full_name, email, affiliation, group }) {
  if (!email) return { error: 'email is required' };

  if (group === 'firm') {
    if (!firmEmailMatchesName(full_name, email)) {
      return { error: `A firm must register from its own domain (e.g. name@${normalizeAlnum(full_name) || 'yourfirm'}.com) so the email matches the firm name.` };
    }
    if (emailInUse(email)) {
      return { error: 'This firm email is already registered.' };
    }
    return { ok: true };
  }

  if (group === 'employee') {
    const firm = findFirmByName(affiliation);
    if (!firm) {
      return { error: 'Affiliation must be the name of a firm already registered in the system. Register the firm first.' };
    }
    if (emailIsFirmMain(email)) {
      return { error: 'That address is the firm main email and is reserved for the firm. Employees must use their own email.' };
    }
    if (emailInUse(email)) {
      return { error: 'This email is already registered. One email can back only one validator.' };
    }
    return { ok: true };
  }

  if (group === 'expert') {
    if (emailIsFirmMain(email)) {
      return { error: 'That address is a firm main email and is reserved for the firm. Use your own email.' };
    }
    if (emailInUse(email)) {
      return { error: 'This email is already registered. One email can back only one validator.' };
    }
    return { ok: true };
  }

  if (emailInUse(email)) {
    return { error: 'This email is already registered.' };
  }
  return { ok: true };
}

// ╔══════════════════════════════════════════════════════════════╗
// ║ HELPER — single SerpAPI lookup                                ║
// ╚══════════════════════════════════════════════════════════════╝
async function serpSearch(terms) {
  try {
    const url  = `https://serpapi.com/search.json?engine=google&num=10&q=${encodeURIComponent(terms)}&tbs=li:1&api_key=${process.env.SERP_API_KEY}`;
    const data = await (await fetch(url)).json();
    if (data.error) {
      const noResults = /hasn'?t returned any results|no results/i.test(data.error);
      if (noResults) return { hits: 0, errored: false, noResults: true };
      return { hits: 0, errored: true, noResults: false, message: data.error };
    }
    return { hits: data.organic_results?.length || 0, errored: false, noResults: false };
  } catch (e) {
    return { hits: 0, errored: true, noResults: false, message: e.message };
  }
}

// ╔══════════════════════════════════════════════════════════════╗
// ║ HELPER — mint a VIC from an ABM result (HCS + SUI + Walrus)   ║
// ║ Shared by /api/round/run (simulated) and /api/round/finalize ║
// ║ (real live votes), so both paths produce an identical VIC.   ║
// ╚══════════════════════════════════════════════════════════════╝
async function mintVicFromAbm({ claim, panel, omega, abm }) {
  const hcsResult = await logToHcs('validation_round_complete', {
    claim_id   : claim.claim_id,
    panel_size : panel.length,
    omega,
    d_final    : abm.d_final,
    conf       : abm.confidence,
    s_agg      : abm.s_agg,
    round_count: abm.round_count,
  });

  const suiResult = await callMove(
    `${PACKAGE_ID}::divg::mint_vic`,
    (tx) => [
      tx.object(ADMIN_CAP),
      tx.pure.string(claim.firm_did),
      tx.pure.vector('u8', Array.from(Buffer.from(claim.claim_hash, 'hex'))),
      tx.pure.u8(abm.d_final),
      tx.pure.u64(Math.round(abm.confidence * 1000)),
      tx.pure.u64(Math.round(abm.s_agg      * 1000)),
      tx.pure.u64(panel.length),
      tx.pure.u64(abm.validators_approved),
      tx.pure.u8(abm.round_count),
      tx.pure.string(STATE.hcsTopicId || 'no-topic'),
      tx.pure.u64(hcsResult.sequence),
    ]
  );

  const round = {
    round_id  : uuid(),
    claim_id  : claim.claim_id,
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
    claim_id            : claim.claim_id,
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
    graph_validators    : (abm.validators || []).map(v => ({
      did   : v.did,
      group : v.group,
      vote  : v.vote,
    })),
    graph_sigmas        : [],
  };

  const walrus = await storeOnWalrus(vic);
  if (walrus) vic.walrus_blob_id = walrus.blobId;

  STATE.vics.push(vic);
  claim.status = 'complete';
  claim.vic_id = vic.vic_id;

  return { round, vic };
}

// ╔══════════════════════════════════════════════════════════════╗
// ║ ROUTES                                                        ║
// ╚══════════════════════════════════════════════════════════════╝
// ============================================================================
// EXTERNAL MEASUREMENT TOOL: Ambition-Adjusted Scoring Engine
// ============================================================================
app.post('/api/impact/score', async (req, res) => {
  try {
    const { companies, options } = req.body;

    // 1. Validate the input
    if (!companies || !Array.isArray(companies)) {
      return res.status(400).json({ 
        error: 'Invalid payload. Please provide an array of company objects under the "companies" key.' 
      });
    }

    // 2. Run the portfolio through the scoring engine
    // We pass the options if the user provided them, otherwise it defaults to k=2.0 and fetching context
    const scorecard = await scorePortfolio(companies, options || { withContext: true, k: 2.0 });

    // 3. Return the fully calculated, context-adjusted scorecard
    res.json(scorecard);

  } catch (error) {
    console.error('❌ Scoring Engine Error:', error);
    res.status(500).json({ error: 'Internal server error during impact scoring execution.' });
  }
});

// ============================================================================
// WALRUS STORAGE: Save Scorecard Immutably
// ============================================================================
app.post('/api/impact/walrus/store', async (req, res) => {
  try {
    const { scorecard } = req.body;
    if (!scorecard) return res.status(400).json({ error: 'No scorecard provided' });

    // Reuse the same real testnet publisher used for VICs (storeOnWalrus),
    // instead of a separate localhost:31415 node that does not exist on Render.
    // This keeps both Walrus paths identical and actually persists the blob.
    const walrus = await storeOnWalrus(scorecard);
    if (!walrus?.blobId) {
      return res.status(502).json({ error: 'Walrus publisher did not return a blob id' });
    }
    res.json({ blobId: walrus.blobId });

  } catch (error) {
    console.error('❌ Walrus Storage Error:', error);
    res.status(500).json({ error: 'Failed to store scorecard to Walrus.' });
  }
});

// ============================================================================
// THE BENCHMARKING AGENT: Read from Walrus & Answer Honestly
// ============================================================================
app.post('/api/agent/ask', async (req, res) => {
  try {
    const { scorecard, question } = req.body;
    if (!scorecard || !question) {
      return res.status(400).json({ error: 'Missing scorecard or question' });
    }

    // The scorecard is passed in directly from the client (no Walrus round-trip,
    // since the analytics scorecard is not reliably persisted to Walrus yet).
    const scorecardData =
      typeof scorecard === 'string' ? scorecard : JSON.stringify(scorecard, null, 2);

    const systemPrompt = `
      You are the DIVG Benchmarking Agent. Your job is to answer investor questions about impact portfolios.
      You must base your answers STRICTLY on the following scorecard.
      If a company used the "shadow" path, you MUST disclose that their actual impact was not reported,
      and the score reflects only their target ambition. Be analytical, concise, and objective.

      SCORECARD DATA:
      ${scorecardData}
    `;

    // Graceful fallback: if no LLM key is configured, return a deterministic
    // summary so the demo still works instead of throwing a 500.
    if (!process.env.OPENAI_API_KEY) {
      const path = scorecard?.path || 'unknown';
      const shadowNote = path === 'shadow'
        ? ' Note: this firm used the SHADOW path — no actual outcome was reported, so the score reflects target ambition only.'
        : '';
      return res.json({
        reply:
          `[[offline mode — no LLM key configured]] ` +
          `Ambition multiplier: ${scorecard?.ambition_multiplier ?? 'N/A'}x, ` +
          `adjusted score: ${scorecard?.adjusted_score ?? 'N/A'}x, ` +
          `benchmark confidence: ${scorecard?.benchmark_confidence ?? 'N/A'}.${shadowNote}`,
      });
    }

    const aiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: question }
        ],
        temperature: 0.2 // Keep it low for analytical honesty
      })
    });

    const aiData = await aiResponse.json();
    // Frontend expects `reply` (was previously `answer`).
    res.json({ reply: aiData.choices?.[0]?.message?.content || 'No response generated.' });

  } catch (error) {
    console.error('❌ AI Agent Error:', error);
    res.status(500).json({ error: 'The Benchmarking Agent failed to process the request.' });
  }
});


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

// Whitelisted emails bypass the SerpAPI gate (e.g. the demo operator).
// Configurable via WHITELISTED_EMAILS (comma-separated) so it isn't hardcoded.
const WHITELISTED_EMAILS = (process.env.WHITELISTED_EMAILS || '')
  .split(',')
  .map(e => e.trim().toLowerCase())
  .filter(Boolean);

app.post('/api/registry/initiate-verification', async (req, res) => {
  const { full_name, email, affiliation, group } = req.body;

  if (!full_name || !email) {
    return res.status(400).json({ error: 'full_name and email are required' });
  }

  const gate = validateRegistration({ full_name, email, affiliation, group });
  if (gate.error) {
    return res.status(400).json({ error: gate.error });
  }

  let webVerified = null; 
  if (WHITELISTED_EMAILS.includes(String(email).toLowerCase())) {
    webVerified = true;
    console.log(`[WHITELIST] Access granted for: ${email}`);
  } 
  else if (process.env.SERP_API_KEY) {
    const pairs = [];
    if (full_name && affiliation) pairs.push(['name+affiliation', `"${full_name}" "${affiliation}"`]);
    if (full_name && email)       pairs.push(['name+email',        `"${full_name}" "${email}"`]);
    if (affiliation && email)     pairs.push(['affiliation+email', `"${affiliation}" "${email}"`]);
    if (pairs.length === 0 && full_name) pairs.push(['name', `"${full_name}"`]); 

    let anyChecked = false; 
    for (const [label, terms] of pairs) {
      const r = await serpSearch(terms);
      if (!r.errored) anyChecked = true;
      console.log(`[SERPAPI] ${label} ${terms} -> hits=${r.hits} errored=${r.errored} noResults=${r.noResults}` + (r.message ? ` (${r.message})` : ''));
      if (r.hits > 0) { webVerified = true; break; } 
    }
    if (webVerified === null && anyChecked) webVerified = false; 

    if (process.env.SERP_STRICT === 'true' && webVerified === false) {
      return res.status(400).json({ error: 'SerpAPI Gate Failed: no public records found for this exact name, affiliation, or email online.' });
    }
    if (webVerified === null) {
      console.log('[SERPAPI] Could not verify (API errored on all queries) — not blocking.');
    }
  } else {
    console.log('[SERPAPI] No SERP_API_KEY found in .env. Bypassing real web check for demo.');
  }

  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  STATE.pendingVerifications[email] = otp;

  let emailSent = false;
  if (process.env.RESEND_API_KEY) {
    try {
      const resendClient = new Resend(process.env.RESEND_API_KEY);
      const { data, error } = await resendClient.emails.send({
        from: process.env.RESEND_FROM || 'onboarding@resend.dev',
        to: email, 
        subject: 'DIVG Validator Gate - Identity Verification',
        html: `
          <div style="font-family: monospace; padding: 20px;">
            <h3>DIVG Verification Infrastructure</h3>
            <p>Hello ${full_name},</p>
            <p>Your identity as an expert/employee for <strong>${affiliation}</strong> has passed the initial web verification gate.</p>
            <p>Your one-time pass-code to mint your W3C DID on the Sui blockchain is:</p>
            <h1 style="letter-spacing: 5px;">${otp}</h1>
          </div>
        `
      });
      if (error) {
        console.error('[RESEND] Send rejected. Check your API key and that RESEND_FROM is a verified domain.', error);
      } else {
        emailSent = true;
        console.log(`[RESEND] Successfully emailed real OTP to ${email} (id: ${data?.id})`);
      }
    } catch (emailError) {
      console.error('[RESEND] Failed to send email. Check your API key and verified domain.', emailError.message);
    }
  } else {
    console.log('[RESEND] No RESEND_API_KEY found in .env. Skipping real email dispatch.');
  }

  res.json({
    success : true,
    // FIX: Only return the demo OTP if DEMO_MODE is true. Otherwise return undefined.
    demoOtp : process.env.DEMO_MODE === 'true' ? otp : undefined, 
    webVerified,
    emailSent,
  });
});

app.post('/api/registry/register', async (req, res) => {
  const { full_name, email, affiliation, group, otp } = req.body; 
  if (!full_name || !email || !group) {
    return res.status(400).json({ error: 'full_name, email, group required' });
  }

  const idHash = createHash('sha256')
    .update(`${full_name}`)
    .digest('hex')
    .slice(0, 16);
  const did = `did:divg:${idHash}`;
  const suiAddr = `0x${createHash("sha256").update(did).digest("hex")}`;

  const existingEntity = [...STATE.firms, ...STATE.validators, ...STATE.investors].find(e => e.did === did);
  
  if (existingEntity) {
    console.log(`[REGISTRY] Entity ${did} already exists. Updating details.`);
    existingEntity.email = email;
    existingEntity.affiliation = affiliation;
    return res.json({ entity: existingEntity, message: 'Already registered (DID preserved)' });
  }

  const gate = validateRegistration({ full_name, email, affiliation, group });
  if (gate.error) {
    return res.status(400).json({ error: gate.error });
  }

  if (group === 'expert' || group === 'employee') {
    if (!otp) {
      return res.status(400).json({ error: 'Validator gate: OTP is required.' });
    }
    if (STATE.pendingVerifications[email] !== otp) {
      return res.status(400).json({ error: 'Validator gate: Invalid or expired OTP.' });
    }
    delete STATE.pendingVerifications[email];
  }

  const entity = {
    address       : suiAddr,
    did,
    full_name,
    email,
    affiliation   : affiliation || 'Independent',
    group,
    reputation    : 0.4 + Math.random() * 0.2,
    active        : true,
    registered_at : new Date().toISOString(),
  };

  if (group === 'firm')      STATE.firms.push(entity);
  else if (group === 'investor') STATE.investors.push(entity);
  else                       STATE.validators.push(entity);

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

  const hcsResult = await logToHcs('entity_registered', { did, group, sui_addr: suiAddr });

  res.json({ entity, sui: suiResult, hcs: hcsResult });
});

app.get('/api/registry', (req, res) => {
  res.json({
    validators : STATE.validators,
    firms      : STATE.firms,
    investors  : STATE.investors,
  });
});

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

app.post('/api/round/run', async (req, res) => {
  const { claim_id, panel_size = 30, ground_truth = null } = req.body;
  const claim = STATE.claims.find(c => c.claim_id === claim_id);
  if (!claim) return res.status(404).json({ error: 'claim not found' });

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

  function shuffle(arr) { return [...arr].sort(() => Math.random() - 0.5); }
  const panel = [
    ...shuffle(byGroup.employee).slice(0,    targets.employee),
    ...shuffle(byGroup.expert).slice(0,      targets.expert),
    ...shuffle(byGroup.beneficiary).slice(0, targets.beneficiary),
  ];

  const omega = ground_truth !== null ? ground_truth : (Math.random() < 0.7 ? 1 : 0);

  const validatorsForABM = panel.map(v => ({
    address       : v.address,
    did           : v.did,
    group         : v.group,
    reputation    : v.reputation,
    p_signal      : v.group === 'expert' ? 0.80 : 0.70,
    honesty_prob  : 0.8,
    cost          : 0.1,
  }));

  let abm;
  try {
    abm = await runPythonABM(validatorsForABM, omega);
  } catch (e) {
    return res.status(500).json({ error: 'ABM failed', detail: e.message });
  }

  const { round, vic } = await mintVicFromAbm({ claim, panel, omega, abm });

  res.json({ round, vic, abm });
});

app.get('/api/round/:round_id', (req, res) => {
  const round = STATE.activeRounds[req.params.round_id];
  if (!round) return res.status(404).json({ error: 'Round not found' });
  res.json(round);
});

app.post('/api/reset', (req, res) => {
  STATE.validators = [];
  STATE.firms      = [];
  STATE.investors  = [];
  STATE.claims     = [];
  STATE.rounds     = [];
  STATE.vics       = [];
  STATE.pendingVerifications = {}; 
  res.json({ ok: true, message: 'Sandbox reset' });
});

app.get('/api/vics', (req, res) => res.json({ vics: STATE.vics }));

app.get('/api/vic/:id', (req, res) => {
  const vic = STATE.vics.find(v => v.vic_id === req.params.id);
  if (!vic) return res.status(404).json({ error: 'VIC not found' });
  res.json({ vic });
});

app.get('/api/vic/walrus/:blobId', async (req, res) => {
  try {
    const resp = await fetch(`${WALRUS_AGGREGATOR}/v1/blobs/${req.params.blobId}`);
    if (!resp.ok) return res.status(404).json({ error: 'Blob not found on Walrus' });
    const vic = await resp.json();
    res.json({ vic, source: 'walrus' });
  } catch (e) {
    res.status(500).json({ error: 'Walrus read failed', detail: e.message });
  }
});

app.post('/api/investor/advisory', (req, res) => {
  const { vic_id, theta } = req.body;
  const vic = STATE.vics.find(v => v.vic_id === vic_id);
  if (!vic) return res.status(404).json({ error: 'VIC not found' });
  const sigma = (vic.d_final === 1 && vic.confidence >= theta) ? 1 : 0;
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

app.post('/api/seed/winnow', async (req, res) => {
  const groupCode = { employee: 0, expert: 1, beneficiary: 2, firm: 3, investor: 4 };
  const addrFrom = (s) => `0x${createHash('sha256').update(s).digest('hex')}`;

  const results = [];

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

app.listen(PORT, () => {
  console.log('╔══════════════════════════════════════════╗');
  console.log(`║ DIVG Backend live on port ${PORT}              ║`);
  console.log('╚══════════════════════════════════════════╝');
});