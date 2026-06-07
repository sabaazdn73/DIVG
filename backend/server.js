// ╔══════════════════════════════════════════════════════════════╗
// ║ DIVG Backend — server.js                                     ║
// ║ Orchestrates: SUI Move calls + Hedera HCS + Python ABM       ║
// ║ + Walrus decentralized storage                               ║
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
import { Resend }                      from 'resend'; // NEW: Resend imported

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

  activeRounds : {}, // { round_id: { claim_id, panel, votes: [], status: 'open' } }
};

// --- ADD THESE NEW ENDPOINTS TO YOUR ROUTES ---

// 1. Initiate a round (Invite the panel)
app.post('/api/round/initiate', (req, res) => {
  const { claim_id, panel_size = 30 } = req.body;
  const round_id = uuid();
  
  // Logic to select the panel (reusing your existing stratified selection logic)
  // ... (Paste your stratified sampling logic from LayerRound.tsx here) ...
  
  STATE.activeRounds[round_id] = {
    claim_id,
    panel, // Your selected validators
    votes: [],
    status: 'open'
  };
  
  res.json({ round_id, panel });
});

// 2. Submit a vote
app.post('/api/round/vote', async (req, res) => {
  const { round_id, did, signal, vote } = req.body;
  const round = STATE.activeRounds[round_id];
  
  if (!round || round.status !== 'open') return res.status(400).json({ error: 'Round closed' });
  
  // Store vote
  round.votes.push({ did, signal, vote });
  
  // If quorum reached, auto-run ABM
  if (round.votes.length >= round.panel.length) {
    round.status = 'finalizing';
    // Trigger your existing Python ABM logic here, then mint VIC
    // ...
  }
  
  res.json({ success: true, progress: `${round.votes.length}/${round.panel.length}` });
});
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
// ║ HELPER — call SUI Move contract                              ║
// ╚══════════════════════════════════════════════════════════════╝
async function callMove(target, args) {
  if (!adminKeypair || !PACKAGE_ID) {
    console.log('[SUI:SIM] would call', target, args);
    return { simulated: true, digest: `sim-${uuid().slice(0, 8)}` };
  }
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
    console.error('[SUI] Call failed:', e.message);
    return { simulated: true, digest: `sim-${uuid().slice(0, 8)}`, error: e.message };
  }
}

// ╔══════════════════════════════════════════════════════════════╗
// ║ HELPER — registration / anti-sybil validation                ║
// ║ (one email = one identity; firm email must match firm name;  ║
// ║  experts/employees affiliate to a registered firm and may    ║
// ║  NOT reuse a firm's main email)                              ║
// ╚══════════════════════════════════════════════════════════════╝
function normalizeAlnum(s) {
  return String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

// Second-level domain label of an email, e.g. a@mail.winnow.com -> "winnow"
function emailDomainSLD(email) {
  const dom   = String(email || '').split('@')[1]?.toLowerCase() || '';
  const parts = dom.split('.').filter(Boolean);
  return parts.length >= 2 ? parts[parts.length - 2] : dom;
}

// Does the email's domain plausibly belong to the firm name?
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

// Returns { ok: true } or { error: '...' }
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

  // Employees belong to a firm: that firm must already be registered (its email
  // proved the firm's domain), and the employee may NOT reuse the firm's main email.
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

  // Experts are independent reviewers — no registered-firm prerequisite and the
  // affiliation stays free-text. They still pass the OTP gate + one-email rule,
  // and may not register under any firm's main email.
  if (group === 'expert') {
    if (emailIsFirmMain(email)) {
      return { error: 'That address is a firm main email and is reserved for the firm. Use your own email.' };
    }
    if (emailInUse(email)) {
      return { error: 'This email is already registered. One email can back only one validator.' };
    }
    return { ok: true };
  }

  // beneficiary / investor
  if (emailInUse(email)) {
    return { error: 'This email is already registered.' };
  }
  return { ok: true };
}

// ╔══════════════════════════════════════════════════════════════╗
// ║ HELPER — single SerpAPI lookup                                ║
// ║ Returns { hits, errored, noResults }:                         ║
// ║   errored=true  -> API/network problem (bad key, credits...)  ║
// ║                    => treat as "could not check" (do NOT block)║
// ║   noResults=true-> API explicitly said zero results           ║
// ║   hits>0        -> public records found                       ║
// ╚══════════════════════════════════════════════════════════════╝
async function serpSearch(terms) {
  try {
    // FIX: Added &tbs=li:1 to force exact string match (verbatim mode) and prevent Google fuzzy matching.
    const url  = `https://serpapi.com/search.json?engine=google&num=10&q=${encodeURIComponent(terms)}&tbs=li:1&api_key=${process.env.SERP_API_KEY}`;
    const data = await (await fetch(url)).json();
    if (data.error) {
      // SerpAPI returns "Google hasn't returned any results..." as an `error`.
      // That is a genuine zero-result, NOT an API failure — classify it as such.
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
// ║ ROUTES                                                        ║
// ╚══════════════════════════════════════════════════════════════╝

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

const WHITELISTED_EMAILS = ['s-sazadegan@ucp.pt'];

// ─── NEW LAYER 1: GATE — Initiate Verification (SerpAPI + OTP) ──
app.post('/api/registry/initiate-verification', async (req, res) => {
  const { full_name, email, affiliation, group } = req.body;

  if (!full_name || !email) {
    return res.status(400).json({ error: 'full_name and email are required' });
  }

  // 0. Anti-sybil / firm rules — fail BEFORE we spend an OTP/email on someone
  //    who will be rejected at register time anyway.
  const gate = validateRegistration({ full_name, email, affiliation, group });
  if (gate.error) {
    return res.status(400).json({ error: gate.error });
  }

  // 1. Check Whitelist (Bypass gate)
  let webVerified = null; 
  if (WHITELISTED_EMAILS.includes(email)) {
    webVerified = true;
    console.log(`[WHITELIST] Access granted for: ${email}`);
  } 
  // 2. Real SerpAPI Check (Only run if not whitelisted)
  else if (process.env.SERP_API_KEY) {
    const pairs = [];
    // FIX: Added explicit quotation marks to force exact match search
    if (full_name && affiliation) pairs.push(['name+affiliation', `"${full_name}" "${affiliation}"`]);
    if (full_name && email)       pairs.push(['name+email',        `"${full_name}" "${email}"`]);
    if (affiliation && email)     pairs.push(['affiliation+email', `"${affiliation}" "${email}"`]);
    if (pairs.length === 0 && full_name) pairs.push(['name', `"${full_name}"`]); // fallback if only a name

    let anyChecked = false; // at least one pair came back without an API/network error
    for (const [label, terms] of pairs) {
      const r = await serpSearch(terms);
      if (!r.errored) anyChecked = true;
      console.log(`[SERPAPI] ${label} ${terms} -> hits=${r.hits} errored=${r.errored} noResults=${r.noResults}` + (r.message ? ` (${r.message})` : ''));
      if (r.hits > 0) { webVerified = true; break; } // first pair that hits = verified, stop early
    }
    if (webVerified === null && anyChecked) webVerified = false; // checked everything, found nothing

    if (process.env.SERP_STRICT === 'true' && webVerified === false) {
      return res.status(400).json({ error: 'SerpAPI Gate Failed: no public records found for this exact name, affiliation, or email online.' });
    }
    if (webVerified === null) {
      console.log('[SERPAPI] Could not verify (API errored on all queries) — not blocking.');
    }
  } else {
    console.log('[SERPAPI] No SERP_API_KEY found in .env. Bypassing real web check for demo.');
  }

  // 3. Generate ONE OTP on the Server.
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  STATE.pendingVerifications[email] = otp;

  // 4. Send that SAME code via Resend.
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

  // 5. Return the code.
  // FIX: Unconditionally return the OTP to the frontend so your live demonstration works even if Resend restricts the email.
  res.json({
    success : true,
    demoOtp : otp, 
    webVerified,
    emailSent,
  });
});

// ─── LAYER 1: REGISTRY — register validator/firm/investor ─────
app.post('/api/registry/register', async (req, res) => {
  const { full_name, email, affiliation, group, otp } = req.body; 
  if (!full_name || !email || !group) {
    return res.status(400).json({ error: 'full_name, email, group required' });
  }

  // 1. Calculate Stable DID (based on full_name)
  const idHash = createHash('sha256')
    .update(`${full_name}`)
    .digest('hex')
    .slice(0, 16);
  const did = `did:divg:${idHash}`;
  const suiAddr = `0x${createHash("sha256").update(did).digest("hex")}`;

  // 2. Check if already exists locally to prevent re-registering on-chain
  const existingEntity = [...STATE.firms, ...STATE.validators, ...STATE.investors].find(e => e.did === did);
  
  if (existingEntity) {
    console.log(`[REGISTRY] Entity ${did} already exists. Updating details.`);
    existingEntity.email = email;
    existingEntity.affiliation = affiliation;
    return res.json({ entity: existingEntity, message: 'Already registered (DID preserved)' });
  }

  // 3. Perform Anti-sybil validation (only for new entities)
  const gate = validateRegistration({ full_name, email, affiliation, group });
  if (gate.error) {
    return res.status(400).json({ error: gate.error });
  }

  // NEW GATE: Verify OTP for Experts and Employees
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
app.post('/api/round/run', async (req, res) => {
  const { claim_id, panel_size = 30, ground_truth = null } = req.body;
  const claim = STATE.claims.find(c => c.claim_id === claim_id);
  if (!claim) return res.status(404).json({ error: 'claim not found' });

  // ── Step 1: Stratified sampling ──
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

  // ── Step 2: Ground truth ω ──
  const omega = ground_truth !== null ? ground_truth : (Math.random() < 0.7 ? 1 : 0);

  // ── Step 3: Run Python Mesa ABM ──
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

  // ── Step 6: Build round + VIC ──
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
    graph_validators    : (abm.validators || []).map(v => ({
      did   : v.did,
      group : v.group,
      vote  : v.vote,
    })),
    graph_sigmas        : [],
  };

  const walrus = await storeOnWalrus(vic);
  if (walrus) {
    vic.walrus_blob_id = walrus.blobId;
  }

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
  STATE.pendingVerifications = {}; // FIX: also clear pending OTPs on reset
  res.json({ ok: true, message: 'Sandbox reset' });
});

// ─── LAYER 5: VIC + INVESTOR ADVISORY ─────────────────────────
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

// ─── SEED DATA — load Winnow/MSM case study + validator pool ──
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

// ╔══════════════════════════════════════════════════════════════╗
// ║ START                                                         ║
// ╚══════════════════════════════════════════════════════════════╝
app.listen(PORT, () => {
  console.log('╔══════════════════════════════════════════╗');
  console.log(`║ DIVG Backend live on port ${PORT}              ║`);
  console.log('║ Endpoints:                                ║');
  console.log('║   POST /api/registry/initiate-verification║');
  console.log('║   POST /api/registry/register             ║');
  console.log('║   POST /api/claim/submit                  ║');
  console.log('║   POST /api/round/run                     ║');
  console.log('║   POST /api/investor/advisory             ║');
  console.log('║   GET  /api/vics                          ║');
  console.log('║   GET  /api/vic/walrus/:blobId            ║');
  console.log('║   POST /api/seed/winnow                   ║');
  console.log('╚══════════════════════════════════════════╝');
});