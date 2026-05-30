import { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GitBranch, Play, Users, Hash, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { apiClaims, apiRunRound, Claim, ABMResult } from '../lib/api';
import { Hero } from './LayerRegistry';
import DIVGScene, { SceneValidator } from '../components/DIVGScene';

export default function LayerRound() {
  const [claims, setClaims]   = useState<Claim[]>([]);
  const [claimId, setClaimId] = useState('');
  const [omega, setOmega]     = useState<'auto' | '1' | '0'>('auto');
  const [size, setSize]       = useState(30);
  const [running, setRunning] = useState(false);
  const [phase, setPhase]     = useState<string>('');
  const [abm, setAbm]         = useState<ABMResult | null>(null);
  const [vic, setVic]         = useState<any>(null);
  const [sceneVals, setSceneVals] = useState<SceneValidator[]>([]);
  const [roundPhase, setRoundPhase] = useState<'idle'|'select'|'commit'|'reveal'|'score'|'done'>('idle');
  const navigate = useNavigate();

  useEffect(() => {
    apiClaims().then(r => {
      setClaims(r.claims);
      const pending = r.claims.find((c: Claim) => c.status === 'pending');
      if (pending) setClaimId(pending.claim_id);
      else if (r.claims.length) setClaimId(r.claims[r.claims.length - 1].claim_id);
    });
  }, []);

  // build a synthetic panel for the animation based on size + composition
  function makePanel(phaseLabel: SceneValidator['phase'], votes?: number[]): SceneValidator[] {
    const nE = Math.floor(size * 0.3), nX = Math.floor(size * 0.3), nB = size - nE - nX;
    const groups = [...Array(nE).fill('employee'), ...Array(nX).fill('expert'), ...Array(nB).fill('beneficiary')];
    return groups.map((g, i) => ({
      group: g, reputation: 0.4 + Math.random() * 0.2, phase: phaseLabel,
      vote: votes ? votes[i] : null,
    }));
  }

  async function run() {
    if (!claimId) return;
    setRunning(true); setAbm(null); setVic(null);

    setPhase('VRF drawing stratified panel from pool...');
    setRoundPhase('select'); setSceneVals(makePanel('pool')); await delay(600);
    setSceneVals(makePanel('selected')); await delay(700);

    setPhase('Stage 1 - validators commit prior beliefs y_i...');
    setRoundPhase('commit'); setSceneVals(makePanel('committed')); await delay(900);

    setPhase('Stage 2 - validators investigate and reveal x_i...');
    setRoundPhase('reveal'); await delay(300);

    try {
      const res = await apiRunRound({
        claim_id: claimId, panel_size: size,
        ground_truth: omega === 'auto' ? null : Number(omega),
      });
      // map real votes into the scene
      const realVals: SceneValidator[] = res.abm.validators.map((v: any) => ({
        group: v.group, reputation: 0.5, vote: v.vote, score: v.score, phase: 'revealed' as const,
      }));
      setSceneVals(realVals); await delay(700);

      setPhase('Computing Compact SPP payments...');
      setRoundPhase('score');
      setSceneVals(realVals.map(v => ({ ...v, phase: 'scored' as const }))); await delay(800);

      setPhase('VIC minted on SUI - audit logged on Hedera HCS');
      setRoundPhase('done');
      setAbm(res.abm); setVic(res.vic);
    } catch (e: any) {
      alert(e?.response?.data?.error || e.message); setPhase(''); setRoundPhase('idle');
    } finally { setRunning(false); }
  }

  return (
    <div className="max-w-7xl mx-auto px-6 py-10">
      <Hero n="03" title="Validation Layer"
        sub="VRF draws a stratified panel, validators commit (y_i) then reveal (x_i), Compact SPP scores each against a random peer. Run unlimited rounds on any claim." />

      <div className="card p-2 mb-6">
        <DIVGScene data={{ mode: 'round', validators: sceneVals, roundPhase }} height={620} />
        <div className="px-3 pb-2 text-[10px] mono text-muted text-center">
          {roundPhase === 'idle' ? 'press run to draw the panel' :
           roundPhase === 'select' ? 'VRF selecting validators from pool' :
           roundPhase === 'commit' ? 'Stage 1 - committing prior beliefs' :
           roundPhase === 'reveal' ? 'Stage 2 - revealing signals' :
           roundPhase === 'score' ? 'Compact SPP scoring (green=approve, amber=reject)' :
           'round complete - VIC minted'}
        </div>
      </div>

      <div className="card p-5 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
          <div className="md:col-span-2">
            <label className="block text-[10px] mono uppercase tracking-wide text-muted mb-1.5">Claim</label>
            <select value={claimId} onChange={(e) => setClaimId(e.target.value)}
              className="w-full border border-border rounded-md px-3 py-2 text-sm bg-white">
              <option value="">-- select claim --</option>
              {claims.map(c => <option key={c.claim_id} value={c.claim_id}>{c.firm_name} - {c.description.slice(0, 45)}...</option>)}
            </select>
          </div>
          <div>
            <label className="block text-[10px] mono uppercase tracking-wide text-muted mb-1.5">Panel size N</label>
            <input type="number" value={size} min={6} max={60} onChange={(e) => setSize(Number(e.target.value))}
              className="w-full border border-border rounded-md px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-[10px] mono uppercase tracking-wide text-muted mb-1.5">Ground truth</label>
            <select value={omega} onChange={(e) => setOmega(e.target.value as any)}
              className="w-full border border-border rounded-md px-3 py-2 text-sm bg-white">
              <option value="auto">auto (random)</option>
              <option value="1">w = 1 (valid)</option>
              <option value="0">w = 0 (invalid)</option>
            </select>
          </div>
        </div>
        <button onClick={run} disabled={running || !claimId}
          className="btn btn-primary w-full mt-4 disabled:opacity-50 flex items-center justify-center gap-2">
          <Play className="w-4 h-4" />{running ? 'Running validation round...' : 'Run validation round'}
        </button>
      </div>

      <AnimatePresence>
        {phase && (
          <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="card px-5 py-3 mb-6 flex items-center gap-3">
            <span className="relative flex h-2 w-2">
              <span className={`absolute inline-flex h-full w-full rounded-full ${running ? 'bg-val animate-ping' : 'bg-hedera'} opacity-75`} />
              <span className={`relative inline-flex rounded-full h-2 w-2 ${running ? 'bg-val' : 'bg-hedera'}`} />
            </span>
            <span className="text-sm mono">{phase}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {abm && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="card p-5">
            <h3 className="font-semibold text-sm mb-3 flex items-center gap-2"><Users className="w-4 h-4" /> Group densities</h3>
            {Object.entries(abm.groups).map(([g, info]) => (
              <div key={g} className="mb-3 last:mb-0">
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="capitalize">{g}</span>
                  <span className="mono">{info.mu.toFixed(3)} <span className="text-muted">/ 0.5</span></span>
                </div>
                <div className="h-2 bg-panel rounded overflow-hidden">
                  <div className={`h-full ${info.decision ? 'bg-hedera' : 'bg-amber-500'}`} style={{ width: `${info.mu * 100}%` }} />
                </div>
                <div className="text-[10px] mono text-muted mt-1">{info.count} validators &middot; D_g = {info.decision}</div>
              </div>
            ))}
          </div>
          <div className="card p-5">
            <h3 className="font-semibold text-sm mb-3">Aggregate signals</h3>
            <StatRow label="D_final" value={abm.d_final} mono />
            <StatRow label="Conf(c)" value={abm.confidence.toFixed(3)} />
            <StatRow label="A agreement" value={abm.agreement_A.toFixed(3)} />
            <StatRow label="Psi diversity" value={abm.diversity_Psi.toFixed(3)} />
            <StatRow label="T stability" value={abm.path_T.toFixed(1)} />
            <StatRow label="S_agg" value={abm.s_agg.toFixed(3)} />
            <StatRow label="Round count" value={abm.round_count} />
          </div>
          {vic && (
            <div className="card p-5 bg-vic/5 border-vic/30">
              <h3 className="font-semibold text-sm mb-3 text-vic flex items-center gap-2"><Hash className="w-4 h-4" /> VIC minted</h3>
              <div className="text-[11px] mono space-y-1.5">
                <div><span className="text-muted">vic_id:</span> {vic.vic_id.slice(0, 20)}...</div>
                <div><span className="text-muted">SUI:</span> {vic.sui_digest?.slice(0, 22)}...</div>
                <div><span className="text-muted">HCS seq:</span> {vic.hedera_sequence}</div>
                <div className="pt-2"><span className="text-muted">approved:</span>{' '}
                  <span className="text-vic font-bold">{vic.validators_approved}/{vic.total_validators}</span></div>
              </div>
              <button onClick={() => navigate('/vic')} className="btn btn-primary w-full mt-4 text-xs">
                View VIC dashboard <ArrowRight className="w-3 h-3 inline ml-1" />
              </button>
            </div>
          )}
        </motion.div>
      )}

      {abm && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="card p-5 mt-6">
          <h3 className="font-semibold text-sm mb-3 flex items-center gap-2"><GitBranch className="w-4 h-4" /> Per-validator Compact SPP payments</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead><tr className="text-left border-b border-border">
                {['#','DID','Group','y_i','s_i','x_i','shadow','x_j','Rq','Score'].map(h =>
                  <th key={h} className="py-2 pr-3 text-muted font-medium mono uppercase tracking-wide text-[10px]">{h}</th>)}
              </tr></thead>
              <tbody className="mono">
                {abm.validators.slice(0, 60).map((v, i) => (
                  <tr key={i} className="border-b border-border/50 hover:bg-panel">
                    <td className="py-2 pr-3 text-muted">{i + 1}</td>
                    <td className="py-2 pr-3 truncate max-w-[120px]">{v.did.slice(-12)}</td>
                    <td className="py-2 pr-3 capitalize">{v.group.slice(0, 3)}</td>
                    <td className="py-2 pr-3">{v.prior.toFixed(2)}</td>
                    <td className="py-2 pr-3">{v.signal}</td>
                    <td className={`py-2 pr-3 font-bold ${v.vote === v.signal ? 'text-hedera' : 'text-amber-600'}`}>{v.vote}</td>
                    <td className="py-2 pr-3">{v.shadow.toFixed(3)}</td>
                    <td className="py-2 pr-3">{v.ref_vote}</td>
                    <td className="py-2 pr-3">{v.rq.toFixed(3)}</td>
                    <td className={`py-2 font-bold ${v.score >= 0.7 ? 'text-hedera' : v.score >= 0.4 ? 'text-amber-600' : 'text-red-600'}`}>
                      {v.score >= 0 ? '+' : ''}{v.score.toFixed(3)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>
      )}
    </div>
  );
}

function StatRow({ label, value, mono = false }: any) {
  return (
    <div className="flex items-center justify-between py-1.5 border-b border-border/50 last:border-0">
      <span className="text-xs text-muted">{label}</span>
      <span className={`text-sm font-semibold ${mono ? 'mono' : ''}`}>{value}</span>
    </div>
  );
}
function delay(ms: number) { return new Promise(r => setTimeout(r, ms)); }
