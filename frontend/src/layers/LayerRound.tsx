import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
// CHANGED: GitBranch to Waypoints to match the global Validation icon
import { Waypoints, Play, Users, Hash, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { apiClaims, apiRunRound, apiRegistry, apiInitiateRound, Claim, ABMResult } from '../lib/api';
import { Hero } from './LayerRegistry';
import DIVGScene, { SceneValidator } from '../components/DIVGScene';
import { LayerGuide, Tip } from '../components/LayerGuide';

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
  const [pool, setPool] = useState<SceneValidator[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    apiClaims().then(r => {
      setClaims(r.claims);
      const pending = r.claims.find((c: Claim) => c.status === 'pending');
      if (pending) setClaimId(pending.claim_id);
      else if (r.claims.length) setClaimId(r.claims[r.claims.length - 1].claim_id);
    });
    // load the real registered validator pool so the VRF draw is visible
    apiRegistry().then(r => setPool(
      (r.validators ?? []).map((v: any) => ({
        group: v.group, reputation: v.reputation, phase: 'pool' as const,
      }))
    ));
  }, []);

  // Stratified VRF draw — mirrors the backend 30/30/40 composition so the
  // visible selection matches what the backend actually computes.
  function stratifiedDraw(poolIn: SceneValidator[], n: number): SceneValidator[] {
    const byGroup = (g: string) => poolIn.filter(v => v.group === g);
    const pick = (arr: SceneValidator[], k: number) =>
      [...arr].sort(() => Math.random() - 0.5).slice(0, k)
        .map(v => ({ ...v, phase: 'selected' as const }));
    const nE = Math.floor(n * 0.3), nX = Math.floor(n * 0.3), nB = n - nE - nX;
    const selected = [
      ...pick(byGroup('employee'), nE),
      ...pick(byGroup('expert'), nX),
      ...pick(byGroup('beneficiary'), nB),
    ];
    const selectedKey = new Set(selected.map(s => s.reputation + s.group));
    const rest = poolIn
      .filter(v => !selectedKey.has(v.reputation + v.group))
      .map(v => ({ ...v, phase: 'pool' as const }));
    return [...rest, ...selected];
  }

  // Fallback synthetic panel (used only when no real validators are registered)
  function makePanel(phaseLabel: SceneValidator['phase'], votes?: number[]): SceneValidator[] {
    const nE = Math.floor(size * 0.3), nX = Math.floor(size * 0.3), nB = size - nE - nX;
    const groups = [...Array(nE).fill('employee'), ...Array(nX).fill('expert'), ...Array(nB).fill('beneficiary')];
    return groups.map((g, i) => ({
      group: g, reputation: 0.4 + Math.random() * 0.2, phase: phaseLabel,
      vote: votes ? votes[i] : null,
    }));
  }

  // OPTION 1: The original, all-at-once simulation workflow
  async function run() {
    if (!claimId) return;
    setRunning(true); setAbm(null); setVic(null);

    // refresh the pool right before drawing (in case validators were just added)
    let livePool = pool;
    try {
      const r = await apiRegistry();
      livePool = (r.validators ?? []).map((v: any) => ({
        group: v.group, reputation: v.reputation, phase: 'pool' as const,
      }));
      setPool(livePool);
    } catch {}

    const haveRealPool = livePool.length >= 3;

    // ── Phase 1: show the full pool, then the stratified VRF draw ──
    setPhase('Validator pool - stratified VRF about to draw...');
    setRoundPhase('select');
    if (haveRealPool) {
      setSceneVals(livePool);              // everyone greyed in the pool
      await delay(900);
      setSceneVals(stratifiedDraw(livePool, size));  // drawn subset lights up by group
      await delay(800);
    } else {
      setSceneVals(makePanel('pool')); await delay(600);
      setSceneVals(makePanel('selected')); await delay(700);
    }

    // ── Phase 2: commit ──
    setPhase('Stage 1 - validators commit prior beliefs y_i...');
    setRoundPhase('commit');
    setSceneVals(prev => prev.map(v => v.phase === 'selected' ? { ...v, phase: 'committed' as const } : v));
    await delay(900);

    // ── Phase 3: reveal (real backend run) ──
    setPhase('Stage 2 - validators investigate and reveal x_i...');
    setRoundPhase('reveal'); await delay(300);

    try {
      const res = await apiRunRound({
        claim_id: claimId, panel_size: size,
        ground_truth: omega === 'auto' ? null : Number(omega),
      });
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

  // OPTION 2: The NEW Live DAO Product Workflow
  async function handleInitiateLiveRound() {
    if (!claimId) return alert('Select a claim first');
    setRunning(true);
    try {
      const res = await apiInitiateRound({ claim_id: claimId, panel_size: size });
      setRunning(false);
      // Redirect the user to the live voting panel dynamic URL
      navigate(`/voting/${res.round_id}`);
    } catch (e: any) {
      console.error(e);
      setRunning(false);
      alert(e?.response?.data?.error || 'Failed to initiate live round.');
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
      <Hero n="03" title="Validation Layer"
        sub="VRF draws a stratified panel from the validator pool, validators commit (y_i) then reveal (x_i), Compact SPP scores each against a random peer. Run unlimited rounds on any claim." />

      <div className="card p-2 mb-6">
        <DIVGScene data={{ mode: 'round', validators: sceneVals, roundPhase }} height={620} />
        <div className="px-3 pb-2 text-[10px] mono text-muted text-center">
          {roundPhase === 'idle' ? `press run - ${pool.length} validators in pool` :
           roundPhase === 'select' ? 'stratified VRF drawing from pool (30% emp / 30% exp / 40% ben)' :
           roundPhase === 'commit' ? 'Stage 1 - committing prior beliefs' :
           roundPhase === 'reveal' ? 'Stage 2 - revealing signals' :
           roundPhase === 'score' ? 'Compact SPP scoring (green=approve, amber=reject)' :
           'round complete - VIC minted'}
        </div>
      </div>

      <LayerGuide
        color="#818cf8" // CHANGED: Updated to specific Neon Validation Blue hex
        insert={<>
          <p>Select a claim, set the <b>panel size N</b>, and choose the ground truth (auto = random, or force valid/invalid to test the mechanism).</p>
          <p>Click <b>Run Simulation</b> for an instant backend result, or <b>Initiate Live Round</b> to experience the decentralized UI where validators log in to submit their signals.</p>
        </>}
        interpret={<>
          <p><b>Group densities &mu;_g</b>: the share of each group that voted yes. A group passes if &mu;_g &ge; 0.5.</p>
          <p><b>D_final = 1</b> means all three groups passed (unanimity across groups). <b>Conf(c)</b> blends agreement, cross-group diversity, and path stability.</p>
          <p><b>Score</b> column = each validator's Compact SPP payment. Honest reporting earns more than misreporting &mdash; that's the incentive at work.</p>
        </>}
      />

      <div className="card p-5 mb-6 bg-black/20 border border-white/5">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
          <div className="md:col-span-2">
            <label className="block text-[10px] mono uppercase tracking-wide text-muted mb-1.5">Claim</label>
            <select value={claimId} onChange={(e) => setClaimId(e.target.value)}
              className="w-full border border-white/10 rounded-md px-3 py-2 text-sm bg-[#05030A] text-white">
              <option value="">-- select claim --</option>
              {claims.map(c => <option key={c.claim_id} value={c.claim_id}>{c.firm_name} - {c.description.slice(0, 45)}...</option>)}
            </select>
          </div>
          <div>
            <label className="block text-[10px] mono uppercase tracking-wide text-muted mb-1.5">Panel size N</label>
            <input type="number" value={size} min={6} max={60} onChange={(e) => setSize(Number(e.target.value))}
              className="w-full border border-white/10 rounded-md px-3 py-2 text-sm bg-[#05030A] text-white" />
          </div>
          <div>
            <label className="block text-[10px] mono uppercase tracking-wide text-muted mb-1.5">Ground truth</label>
            <select value={omega} onChange={(e) => setOmega(e.target.value as any)}
              className="w-full border border-white/10 rounded-md px-3 py-2 text-sm bg-[#05030A] text-white">
              <option value="auto">auto (random)</option>
              <option value="1">w = 1 (valid)</option>
              <option value="0">w = 0 (invalid)</option>
            </select>
          </div>
        </div>
        
        {/* THE NEW DUAL BUTTON LAYOUT (WITH ENHANCED STYLING) */}
        <div className="flex gap-3 mt-5">
          <button onClick={run} disabled={running || !claimId}
            className="flex-1 btn border border-white/10 hover:bg-white/5 flex items-center justify-center gap-2 disabled:opacity-50 transition-all text-gray-300 font-semibold py-2.5 rounded-md">
            <Play className="w-4 h-4" />{running ? 'Running simulation...' : 'Run Simulation'}
          </button>
          
          {/* CHANGED: Enhanced glowing shadow to match B2B portal */}
          <button onClick={handleInitiateLiveRound} disabled={running || !claimId}
            className="flex-1 bg-vic text-white rounded-md flex items-center justify-center gap-2 font-bold transition-all hover:bg-vic/90 disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_15px_rgba(192,132,252,0.3)] py-2.5">
            <Users className="w-4 h-4" /> Initiate Live Round
          </button>
        </div>
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
            <h3 className="font-semibold text-sm mb-3 flex items-center gap-2 text-white"><Users className="w-4 h-4" /> Group densities</h3>
            {Object.entries(abm.groups).map(([g, info]) => (
              <div key={g} className="mb-3 last:mb-0">
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="capitalize text-gray-300">{g}</span>
                  <span className="mono text-white">{info.mu.toFixed(3)} <span className="text-muted">/ 0.5</span></span>
                </div>
                <div className="h-2 bg-white/5 rounded overflow-hidden">
                  <div className={`h-full ${info.decision ? 'bg-hedera' : 'bg-amber-500'}`} style={{ width: `${info.mu * 100}%` }} />
                </div>
                <div className="text-[10px] mono text-muted mt-1">{info.count} validators &middot; D_g = {info.decision}</div>
              </div>
            ))}
          </div>
          <div className="card p-5">
            <h3 className="font-semibold text-sm mb-3 text-white">Aggregate signals</h3>
            <StatRow label="D_final" value={abm.d_final} mono tip="Final decision. 1 = all three stakeholder groups reached majority approval (unanimity across groups). 0 = at least one group did not." />
            <StatRow label="Conf(c)" value={abm.confidence.toFixed(3)} tip="Confidence = 0.4*agreement + 0.4*cross-group diversity + 0.2*path stability. Above 0.8 is strong consensus." />
            <StatRow label="A agreement" value={abm.agreement_A.toFixed(3)} tip="Global agreement density: the overall share of validators who voted to approve." />
            <StatRow label="Psi diversity" value={abm.diversity_Psi.toFixed(3)} tip="Inter-group divergence penalty. Near 1 means the three groups agreed with each other; lower means they diverged." />
            <StatRow label="T stability" value={abm.path_T.toFixed(1)} tip="Path stability: 1.0 if resolved in the primary round, 0.5 if a secondary arbitration cycle was triggered." />
            <StatRow label="S_agg" value={abm.s_agg.toFixed(3)} tip="Reputation-weighted aggregate sentiment across all validators." />
            <StatRow label="Round count" value={abm.round_count} tip="1 = decided in the primary round. 2 = a secondary reputation-weighted arbitration cycle was needed." />
          </div>
          {vic && (
            <div className="card p-5 bg-vic/10 border border-vic/30">
              <h3 className="font-semibold text-sm mb-3 text-vic flex items-center gap-2"><Hash className="w-4 h-4" /> VIC minted</h3>
              <div className="text-[11px] mono space-y-1.5">
                <div><span className="text-muted">vic_id:</span> <span className="text-gray-200">{vic.vic_id.slice(0, 20)}...</span></div>
                <div><span className="text-muted">SUI:</span> <span className="text-gray-200">{vic.sui_digest?.slice(0, 22)}...</span></div>
                <div><span className="text-muted">HCS seq:</span> <span className="text-gray-200">{vic.hedera_sequence}</span></div>
                <div className="pt-2"><span className="text-muted">approved:</span>{' '}
                  <span className="text-vic font-bold">{vic.validators_approved}/{vic.total_validators}</span></div>
              </div>
              <button onClick={() => navigate('/vic')} className="btn bg-vic hover:bg-vic/80 text-white w-full mt-4 text-xs py-2 rounded-md transition-colors font-bold flex justify-center items-center">
                View VIC dashboard <ArrowRight className="w-3 h-3 inline ml-1" />
              </button>
            </div>
          )}
        </motion.div>
      )}

      {abm && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="card p-5 mt-6 border border-white/5 bg-black/20">
          {/* CHANGED: Replaced GitBranch with Waypoints here */}
          <h3 className="font-semibold text-sm mb-3 flex items-center gap-2 text-white"><Waypoints className="w-4 h-4 text-blue-400" /> Per-validator Compact SPP payments</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead><tr className="text-left border-b border-white/10">
                {['#','DID','Group','y_i','s_i','x_i','shadow','x_j','Rq','Score'].map(h =>
                  <th key={h} className="py-2 pr-3 text-gray-500 font-medium mono uppercase tracking-wide text-[10px]">{h}</th>)}
              </tr></thead>
              <tbody className="mono">
                {abm.validators.slice(0, 60).map((v, i) => (
                  <tr key={i} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                    <td className="py-2 pr-3 text-gray-500">{i + 1}</td>
                    <td className="py-2 pr-3 truncate max-w-[120px] text-gray-300">{v.did.slice(-12)}</td>
                    <td className="py-2 pr-3 capitalize text-gray-400">{v.group.slice(0, 3)}</td>
                    <td className="py-2 pr-3 text-gray-300">{v.prior.toFixed(2)}</td>
                    <td className="py-2 pr-3 text-gray-300">{v.signal}</td>
                    <td className={`py-2 pr-3 font-bold ${v.vote === v.signal ? 'text-hedera' : 'text-amber-500'}`}>{v.vote}</td>
                    <td className="py-2 pr-3 text-gray-400">{v.shadow.toFixed(3)}</td>
                    <td className="py-2 pr-3 text-gray-300">{v.ref_vote}</td>
                    <td className="py-2 pr-3 text-gray-400">{v.rq.toFixed(3)}</td>
                    <td className={`py-2 font-bold ${v.score >= 0.7 ? 'text-hedera' : v.score >= 0.4 ? 'text-amber-500' : 'text-red-500'}`}>
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

function StatRow({ label, value, mono = false, tip }: any) {
  return (
    <div className="flex items-center justify-between py-1.5 border-b border-white/5 last:border-0">
      <span className="text-xs text-gray-400 flex items-center">{label}{tip && <Tip text={tip} />}</span>
      <span className={`text-sm font-semibold text-gray-200 ${mono ? 'mono' : ''}`}>{value}</span>
    </div>
  );
}
function delay(ms: number) { return new Promise(r => setTimeout(r, ms)); }