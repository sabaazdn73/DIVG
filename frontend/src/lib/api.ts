import axios from 'axios';

// NOTE: legacy constant — no longer used to make requests (kept for reference).
//       `apiInitiateVerification` now uses the shared `api` instance below, so it
//       respects VITE_API_BASE just like every other call. Exported so it doesn't
//       trip `noUnusedLocals` while remaining in the file.
export const API_BASE = 'http://localhost:4000/api';

// VITE_API_BASE = backend ORIGIN only, no trailing /api (every path below already includes /api).
// Leave empty to use a Vite dev proxy for /api.
const BASE = import.meta.env.VITE_API_BASE || '';

export const api = axios.create({
  baseURL: BASE,
  timeout: 60000,
});

export type Entity = {
  address       : string;
  did           : string;
  full_name     : string;
  email         : string;
  affiliation   : string;
  group         : 'employee' | 'expert' | 'beneficiary' | 'firm' | 'investor';
  reputation    : number;
  active        : boolean;
  registered_at : string;
  simulated?    : boolean;
};

export type Claim = {
  claim_id     : string;
  firm_did     : string;
  firm_name    : string;
  description  : string;
  claim_hash   : string;
  status       : 'pending' | 'complete';
  vic_id?      : string;
  submitted_at : string;
};

export type ABMValidator = {
  did      : string;
  group    : string;
  prior    : number;
  signal   : number;
  vote     : number;
  shadow   : number;
  ref_did  : string;
  ref_vote : number;
  rq       : number;
  score    : number;
  aligned  : number;
};

export type ABMResult = {
  d_final             : number;
  confidence          : number;
  s_agg               : number;
  validators_approved : number;
  round_count         : number;
  agreement_A         : number;
  diversity_Psi       : number;
  path_T              : number;
  groups: Record<string, { mu: number; decision: number; count: number }>;
  validators          : ABMValidator[];
};

export type VIC = {
  vic_id              : string;
  claim_id            : string;
  firm_did            : string;
  d_final             : number;
  confidence          : number;
  s_agg               : number;
  total_validators    : number;
  validators_approved : number;
  round_count         : number;
  hedera_topic_id     : string;
  hedera_sequence     : number;
  sui_digest          : string;
  minted_at           : string;
  graph_validators?   : { did: string; group: string; vote: number }[];
  graph_sigmas?       : { sigma: number; theta: number; at: string }[];
  walrus_blob_id?     : string;
};

// ─── STANDARD API METHODS ─────────────────────────────────────────────

export const apiHealth      = () => api.get('/api/health').then(r => r.data);
export const apiRegister    = (p: any) => api.post('/api/registry/register', p).then(r => r.data);
export const apiRegistry    = () => api.get('/api/registry').then(r => r.data);
// Submit a claim. If `evidenceFile` is provided, send multipart/form-data so the
// backend can store the raw file on Walrus; otherwise send plain JSON.
export const apiSubmitClaim = (p: any) => {
  if (p && p.evidenceFile instanceof File) {
    const fd = new FormData();
    fd.append('firm_did', p.firm_did);
    fd.append('description', p.description);
    fd.append('claim_data', JSON.stringify(p.claim_data || {}));
    fd.append('evidence', p.evidenceFile);
    return api.post('/api/claim/submit', fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then(r => r.data);
  }
  return api.post('/api/claim/submit', p).then(r => r.data);
};
export const apiClaims      = () => api.get('/api/claims').then(r => r.data);
export const apiRunRound    = (p: any) => api.post('/api/round/run', p).then(r => r.data);
export const apiVics        = () => api.get('/api/vics').then(r => r.data);
export const apiAdvisory    = (p: any) => api.post('/api/investor/advisory', p).then(r => r.data);
export const apiSeed        = () => api.post('/api/seed/winnow').then(r => r.data);
export const apiReset       = () => api.post('/api/reset').then(r => r.data);

// ─── WALRUS & VIC METHODS ─────────────────────────────────────────────

export const apiVicFromWalrus = (blobId: string) =>
  api.get(`/api/vic/walrus/${blobId}`).then(r => r.data.vic);

export const apiVic = (id: string) => 
  api.get(`/api/vic/${id}`).then(r => r.data.vic);

// Fetch a live round by id through the shared api instance (relative path).
export const apiGetRound = (roundId: string) =>
  api.get(`/api/round/${roundId}`).then(r => r.data);

// ─── NEW: LIVE DAO WORKFLOW & VERIFICATION METHODS ────────────────────

// For Layer 1: SerpAPI / Resend Anti-Sybil Gate
export const apiInitiateVerification = (payload: any) => 
  api.post('/api/registry/initiate-verification', payload).then(r => r.data);

// For Layer 3: Initiating the Live Voting Panel (Sortition)
export const apiInitiateRound = (p: { claim_id: string, panel_size?: number }) => 
  api.post('/api/round/initiate', p).then(r => r.data);

// For Layer 4: Casting votes on the Live Validation Dashboard
export const apiVote = (data: { round_id: string; did: string; signal: number; vote: number }) =>
  api.post('/api/round/vote', data).then(r => r.data);

// Finalize a live round → mints a VIC from the real collected votes.
export const apiFinalizeRound = (data: { round_id: string; ground_truth?: number | null }) =>
  api.post('/api/round/finalize', data).then(r => r.data);

// ============================================================================
// IMPACT SCORING ANALYTICS
// ============================================================================
export async function apiScoreImpact(companies: any[]) {
  // Use the shared `api` instance so this call respects VITE_API_BASE and the
  // Vercel `/api/*` rewrite, exactly like every other request in this app.
  // (Previously hit VITE_API_URL || localhost:4000, which broke in production.)
  const { data } = await api.post('/api/impact/score', { companies });
  return data;
}

// ============================================================================
// WALRUS & AI AGENT INTEGRATION
// ============================================================================
export async function apiStoreScorecard(scorecard: any) {
  const { data } = await api.post('/api/impact/walrus/store', { scorecard });
  return data;
}

// Agent now receives the scorecard object directly (no Walrus round-trip).
// Returns { reply } to match what LayerAnalytics expects.
export async function apiAskAgent(question: string, scorecard: any, blobId?: string | null) {
  const { data } = await api.post('/api/agent/ask', { question, scorecard, blobId });
  return data;
}
