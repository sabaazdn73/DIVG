import axios from 'axios';

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
};

export const apiHealth      = () => api.get('/api/health').then(r => r.data);
export const apiRegister    = (p: any) => api.post('/api/registry/register', p).then(r => r.data);
export const apiRegistry    = () => api.get('/api/registry').then(r => r.data);
export const apiSubmitClaim = (p: any) => api.post('/api/claim/submit', p).then(r => r.data);
export const apiClaims      = () => api.get('/api/claims').then(r => r.data);
export const apiRunRound    = (p: any) => api.post('/api/round/run', p).then(r => r.data);
export const apiVics        = () => api.get('/api/vics').then(r => r.data);
export const apiAdvisory    = (p: any) => api.post('/api/investor/advisory', p).then(r => r.data);
export const apiSeed        = () => api.post('/api/seed/winnow').then(r => r.data);
export const apiReset = () => api.post('/api/reset').then(r => r.data);
