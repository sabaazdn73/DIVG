import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useLocation, useNavigate } from 'react-router-dom';
import { FileText, Send, Share2, Mail, CheckCircle2, ArrowRight, ExternalLink, RotateCcw, Hash, Plus, Database } from 'lucide-react';
import { apiRegistry, apiSubmitClaim, apiClaims, apiInitiateRound, Claim } from '../lib/api';
import { Hero } from './LayerRegistry';
import DIVGScene from '../components/DIVGScene';
import { LayerGuide } from '../components/LayerGuide';
import PortalNavigation from '../components/PortalNavigation';

const EMPTY = {
  description: '', tonnes_food_saved: 0, co2e_prevented: 0, sites: 0, period: '',
  sector: '', target_pace: '', actual_pace: '', geo: '',
};

export default function LayerClaim() {
  const location = useLocation();
  const navigate = useNavigate();
  const isFirmPortal = new URLSearchParams(location.search).get('portal') === 'firm';

  const [firms, setFirms] = useState<any[]>([]);
  const [claims, setClaims] = useState<Claim[]>([]);
  const [firmDid, setFirmDid] = useState('');
  const [form, setForm] = useState<any>({ ...EMPTY });
  
  // App State for the B2B Workflow
  const [status, setStatus] = useState<'idle' | 'submitting' | 'submitted' | 'initiating' | 'live'>('idle');
  const [claimId, setClaimId] = useState<string | null>(null);
  const [roundId, setRoundId] = useState<string | null>(null);
  const [panel, setPanel] = useState<any[]>([]);
  const [lastHash, setLastHash] = useState<string | null>(null);
  const [evidenceFile, setEvidenceFile] = useState<File | null>(null);
  const [evidenceBlob, setEvidenceBlob] = useState<string | null>(null);
  const [autoScore, setAutoScore] = useState<any>(null);

  async function load() {
    try {
      const r = await apiRegistry();
      setFirms(r.firms);
      if (r.firms.length > 0 && !firmDid) setFirmDid(r.firms[0].did);
      const c = await apiClaims();
      setClaims(c.claims);
    } catch (e) {
      console.error('Failed to load registry/claims', e);
    }
  }
  useEffect(() => { load(); }, []);

  function fillWinnowExample() {
    setForm({
      description: 'Winnow AI-driven food waste monitoring reduced waste by 47% across 120 hospitality sites in Portugal and Spain in Q1 2025, saving an estimated 380 tonnes of food and preventing ~1,140 tonnes of CO2e.',
      tonnes_food_saved: 380, co2e_prevented: 1140, sites: 120, period: 'Q1 2025',
      sector: 'food waste', target_pace: 9.0, actual_pace: 7.5, geo: 'GB',
    });
  }

  async function submit(e: any) {
    e.preventDefault();
    if (!firmDid) return;
    setStatus('submitting');
    try {
      const { description, ...rest } = form;
      // Only send scoring inputs if the firm actually filled them; drop empties
      // so the backend's "auto-score only if possible" logic stays clean.
      const claim_data: any = {
        tonnes_food_saved: rest.tonnes_food_saved,
        co2e_prevented: rest.co2e_prevented,
        sites: rest.sites,
        period: rest.period,
      };
      if (rest.sector) claim_data.sector = rest.sector;
      if (rest.geo) claim_data.geo = rest.geo;
      if (rest.target_pace !== '' && rest.target_pace != null) claim_data.target_pace = Number(rest.target_pace);
      if (rest.actual_pace !== '' && rest.actual_pace != null) claim_data.actual_pace = Number(rest.actual_pace);

      const res = await apiSubmitClaim({ firm_did: firmDid, description, claim_data, evidenceFile });

      setClaimId(res.claim.claim_id);
      setLastHash(res.claim.claim_hash);
      setEvidenceBlob(res.claim?.evidence?.walrus_blob_id || null);
      setAutoScore(res.claim?.auto_score || null);
      setStatus('submitted');
      await load();
    } catch (e: any) {
      alert(e?.response?.data?.error || e.message);
      setStatus('idle');
    }
  }

  async function handleInitiateRound() {
    if (!claimId) return;
    setStatus('initiating');
    try {
      const res = await apiInitiateRound({ claim_id: claimId, panel_size: 30 });
      setRoundId(res.round_id);
      setPanel(res.panel);
      setStatus('live');
    } catch (err) {
      console.error(err);
      alert('Failed to initiate round');
      setStatus('submitted');
    }
  }

  function copyRecruitmentLink() {
    navigator.clipboard.writeText(`${window.location.origin}/portal`);
    alert('Public Recruitment Link copied! Share this to invite experts to register in the Validator Pool.');
  }

  function copyVotingLink() {
    navigator.clipboard.writeText(`${window.location.origin}/voting/${roundId}`);
    alert('Live Voting Link copied! (In production, validators click this from their automated email).');
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-6 sm:pt-10 pb-28 font-['Inter',sans-serif] text-gray-100">
      
      {/* ─── ADMIN HEADER (Hidden in Portal Mode) ─── */}
      {!isFirmPortal && (
        <>
          <Hero n="02" title="Claim Layer"
            sub="Any registered firm can submit unlimited impact claims. Each is hashed (SHA-256), anchored on SUI, and logged to Hedera HCS. Submit as many as you like." />

          <div className="card p-2 mb-6 hidden lg:block bg-black/20 border-white/5">
            <DIVGScene data={{ mode: 'claim', claimsCount: claims.length }} height={620} />
            <div className="px-3 pb-2 text-[10px] mono text-gray-500 text-center uppercase tracking-widest">
              firm node emitting claim crystals &middot; {claims.length} claims anchored
            </div>
          </div>

          <LayerGuide
            color="#0284C7"
            insert={<>
              <p>Pick the issuing firm from the dropdown (any registered firm works).</p>
              <p>Write the claim description and the metrics (tonnes saved, CO2e, sites, period). Use <b>fill Winnow example</b> for the demo case.</p>
              <p>Click <b>Submit claim on-chain</b>. The claim is hashed and immutably recorded.</p>
            </>}
            interpret={<>
              <p>Once anchored, you can immediately initiate the <b>Live Verification Round</b>.</p>
              <p>This automatically executes the sortition logic and simulates dispatching secure voting links to the panel.</p>
            </>}
          />
        </>
      )}

      {isFirmPortal && (
        <div className="mb-8 border-b border-white/10 pb-4">
          <h1 className="text-3xl font-bold text-white mb-2">Firm Impact Portal</h1>
          <p className="text-gray-400">Declare your operational impact data for decentralized verification.</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        
        {/* ─── LEFT COLUMN: THE 3-STATE WORKFLOW ─── */}
        <div className="lg:col-span-3 space-y-6">
          
          {/* STATE 1: IDLE / SUBMITTING (The Form) */}
          {(status === 'idle' || status === 'submitting') && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="card p-5 bg-black/40 border border-white/10">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2 text-sky-400">
                  <Plus className="w-4 h-4" />
                  <h2 className="font-semibold text-sm uppercase tracking-wider">Submit impact claim</h2>
                </div>
                <button type="button" onClick={fillWinnowExample} className="text-[11px] mono text-gray-500 hover:text-white flex items-center gap-1 transition-colors">
                  <RotateCcw className="w-3 h-3" /> fill Winnow example
                </button>
              </div>

              <form onSubmit={submit} className="space-y-4">
                <div>
                  <label className="block text-[10px] mono uppercase tracking-wide text-gray-500 mb-1.5">Issuing Organization</label>
                  <select value={firmDid} onChange={(e) => setFirmDid(e.target.value)}
                    className="w-full border border-white/10 rounded-md px-3 py-2 text-sm bg-[#05030A] text-white focus:ring-1 focus:ring-sky-500 outline-none" required>
                    <option value="">-- Select your firm --</option>
                    {firms.filter(f => f.group === 'firm').map(f => (
                      <option key={f.did} value={f.did}>{f.full_name} &middot; {f.did.slice(-10)}</option>
                    ))}
                  </select>
                  {firms.filter(f => f.group === 'firm').length === 0 && (
                    <p className="text-[11px] text-amber-500 mt-1.5">
                      No firms found. Go to the Overview and click "Seed Winnow" first.
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-[10px] mono uppercase tracking-wide text-gray-500 mb-1.5">Impact Declaration</label>
                  <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
                    placeholder="Describe the impact claim to be verified..."
                    className="w-full border border-white/10 rounded-md px-3 py-2 text-sm h-28 resize-none bg-[#05030A] text-white focus:outline-none focus:ring-1 focus:ring-sky-500" required />
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  <NumField label="Tonnes saved" value={form.tonnes_food_saved} onChange={(v: number) => setForm({ ...form, tonnes_food_saved: v })} />
                  <NumField label="CO2e prevented (t)" value={form.co2e_prevented} onChange={(v: number) => setForm({ ...form, co2e_prevented: v })} />
                  <NumField label="Sites" value={form.sites} onChange={(v: number) => setForm({ ...form, sites: v })} />
                  <div>
                    <label className="block text-[10px] mono uppercase tracking-wide text-gray-500 mb-1.5">Period</label>
                    <input value={form.period} onChange={(e) => setForm({ ...form, period: e.target.value })}
                      placeholder="e.g. Q1 2025" className="w-full border border-white/10 rounded-md px-3 py-2 text-sm bg-[#05030A] text-white focus:outline-none focus:ring-1 focus:ring-sky-500" />
                  </div>
                </div>

                {/* Evidence upload → stored on Walrus, hash anchored on SUI */}
                <div>
                  <label className="block text-[10px] mono uppercase tracking-wide text-gray-500 mb-1.5">
                    Evidence file (optional) — stored on Walrus, hash anchored on SUI
                  </label>
                  <input type="file" accept=".pdf,.png,.jpg,.jpeg,.csv,.json"
                    onChange={(e) => setEvidenceFile(e.target.files?.[0] || null)}
                    className="w-full text-xs text-gray-400 file:mr-3 file:py-2 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-bold file:bg-teal-500/20 file:text-teal-300 hover:file:bg-teal-500/30 cursor-pointer" />
                  {evidenceFile && (
                    <p className="text-[10px] text-teal-400 mt-1 mono">
                      {evidenceFile.name} ({(evidenceFile.size / 1024).toFixed(0)} KB) — will be anchored to Walrus
                    </p>
                  )}
                </div>

                {/* Optional impact scoring inputs — if filled, the system auto-computes
                    the Layer-7 score and shows it to validators. Honest & optional. */}
                <div className="border border-purple-500/20 bg-purple-500/[0.04] rounded-md p-3 space-y-3">
                  <p className="text-[10px] mono uppercase tracking-wide text-purple-300">
                    Impact scoring (optional) — auto-computed vs GIIN benchmarks
                  </p>
                  <p className="text-[10px] text-gray-500 leading-relaxed">
                    If you provide a sector and an annualized pace of change (%/yr), the system
                    automatically scores this claim against real GIIN sector benchmarks and shows
                    it to validators. It's optional, automated, and may be imperfect — leave blank to skip.
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] mono uppercase tracking-wide text-gray-500 mb-1.5">Sector</label>
                      <select value={form.sector} onChange={(e) => setForm({ ...form, sector: e.target.value })}
                        className="w-full border border-white/10 rounded-md px-3 py-2 text-sm bg-[#05030A] text-white focus:outline-none focus:ring-1 focus:ring-purple-500">
                        <option value="">— none (skip scoring) —</option>
                        <option value="energy">Energy (GIIN)</option>
                        <option value="financial inclusion">Financial inclusion (GIIN)</option>
                        <option value="climate">Climate / GHG (IPCC)</option>
                        <option value="food waste">Food waste (illustrative)</option>
                        <option value="agriculture">Agriculture (illustrative)</option>
                        <option value="healthcare">Healthcare (illustrative)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] mono uppercase tracking-wide text-gray-500 mb-1.5">Geo (optional)</label>
                      <input value={form.geo} onChange={(e) => setForm({ ...form, geo: e.target.value })}
                        placeholder="e.g. GB" className="w-full border border-white/10 rounded-md px-3 py-2 text-sm bg-[#05030A] text-white focus:outline-none focus:ring-1 focus:ring-purple-500" />
                    </div>
                    <div>
                      <label className="block text-[10px] mono uppercase tracking-wide text-amber-400/80 mb-1.5">Target pace (%/yr)</label>
                      <input type="number" step="0.1" value={form.target_pace} onChange={(e) => setForm({ ...form, target_pace: e.target.value })}
                        placeholder="e.g. 9" className="w-full border border-white/10 rounded-md px-3 py-2 text-sm bg-[#05030A] text-white focus:outline-none focus:ring-1 focus:ring-amber-500" />
                    </div>
                    <div>
                      <label className="block text-[10px] mono uppercase tracking-wide text-emerald-400/80 mb-1.5">Actual pace (%/yr)</label>
                      <input type="number" step="0.1" value={form.actual_pace} onChange={(e) => setForm({ ...form, actual_pace: e.target.value })}
                        placeholder="optional" className="w-full border border-white/10 rounded-md px-3 py-2 text-sm bg-[#05030A] text-white focus:outline-none focus:ring-1 focus:ring-emerald-500" />
                    </div>
                  </div>
                </div>

                <button type="submit" disabled={status === 'submitting' || !firmDid} className="w-full btn bg-sky-500 text-black font-bold py-3 mt-2 rounded-md hover:bg-sky-400 transition-all flex items-center justify-center gap-2 disabled:opacity-50">
                  {status === 'submitting' ? 'Anchoring to Blockchain...' : <><Send className="w-4 h-4" /> Sign & Anchor Claim</>}
                </button>
              </form>
            </motion.div>
          )}

          {/* STATE 2: SUBMITTED (Ready to recruit or initiate) */}
          {(status === 'submitted' || status === 'initiating') && (
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="card p-6 border-sky-500/30 bg-sky-500/5 shadow-md">
              <div className="flex items-center gap-3 mb-6">
                <CheckCircle2 className="w-8 h-8 text-sky-400" />
                <div>
                  <h3 className="font-bold text-lg text-sky-400">Claim Anchored Successfully</h3>
                  <p className="text-xs text-gray-500 font-mono mt-1">Hash: {lastHash?.slice(0, 32)}...</p>
                  {evidenceBlob && (
                    <p className="text-[11px] text-teal-400 font-mono mt-1 flex items-center gap-1">
                      <Database className="w-3 h-3" /> Evidence on Walrus: {evidenceBlob.slice(0, 20)}...
                    </p>
                  )}
                </div>
              </div>

              <div className="space-y-4">
                {autoScore && (
                  <div className="p-4 bg-purple-500/[0.06] border border-purple-500/25 rounded-lg">
                    <h4 className="text-sm font-bold mb-1 flex items-center gap-2 text-purple-200">
                      <Database className="w-4 h-4 text-purple-400" /> System impact score (optional, automated)
                    </h4>
                    <p className="text-[11px] text-gray-400 mb-3 leading-relaxed">
                      Computed automatically against {autoScore.benchmark_source} benchmarks
                      {autoScore.illustrative ? ' (illustrative)' : ''}. Shown to validators as guidance — it may be imperfect.
                    </p>
                    <div className="grid grid-cols-3 gap-3 text-center">
                      <div>
                        <div className="text-[9px] mono uppercase text-gray-500">Ambition</div>
                        <div className="text-lg font-mono text-white">{autoScore.ambition_multiplier ?? 'N/A'}x</div>
                      </div>
                      <div>
                        <div className="text-[9px] mono uppercase text-gray-500">Adjusted</div>
                        <div className="text-lg font-mono text-teal-400">{autoScore.adjusted_score ?? 'N/A'}x</div>
                      </div>
                      <div>
                        <div className="text-[9px] mono uppercase text-gray-500">SDG gap</div>
                        <div className="text-lg font-mono text-emerald-400">{autoScore.sdg_gap ?? 'N/A'}x</div>
                      </div>
                    </div>
                    <p className="text-[10px] text-gray-500 mt-2 mono truncate">{autoScore.benchmark_citation}</p>
                  </div>
                )}

                <div className="p-4 bg-[#05030A] border border-white/10 rounded-lg">
                  <h4 className="text-sm font-bold mb-1 flex items-center gap-2 text-white"><Share2 className="w-4 h-4 text-sky-400"/> Optional: Grow your Validator Pool</h4>
                  <p className="text-xs text-gray-400 mb-3">Share your public portal link to invite industry experts to register before you lock the panel.</p>
                  <button onClick={copyRecruitmentLink} className="w-full btn bg-white/5 hover:bg-white/10 text-white border border-white/10 rounded-md py-2 text-xs font-semibold transition-colors">
                    Copy Public Recruitment Link
                  </button>
                </div>

                <div className="p-4 bg-[#05030A] border border-white/10 rounded-lg border-l-4 border-l-purple-500">
                  <h4 className="text-sm font-bold mb-1 flex items-center gap-2 text-white"><Mail className="w-4 h-4 text-purple-400"/> Action Required: Begin Verification</h4>
                  <p className="text-xs text-gray-400 mb-3">Our VRF will instantly draw a stratified panel of 30 validators and dispatch secure voting emails.</p>
                  <button 
                    onClick={handleInitiateRound}
                    disabled={status === 'initiating'}
                    className="w-full btn bg-purple-500 text-white rounded-md text-sm font-bold py-3 flex items-center justify-center gap-2 disabled:opacity-50 shadow-sm hover:bg-purple-400 transition-colors"
                  >
                    {status === 'initiating' ? 'Sortition in progress...' : 'Initiate Sortition & Send Emails'}
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {/* STATE 3: LIVE (Voting is active) */}
          {status === 'live' && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="card p-6 border-purple-500/30 bg-purple-500/5 shadow-md">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-3 h-3 rounded-full bg-purple-400 animate-pulse" />
                <h3 className="font-bold text-lg text-purple-400">Voting Panel is Live</h3>
              </div>
              
              <p className="text-sm text-gray-400 mb-4 leading-relaxed">
                The sortition is complete. Secure voting links have been automatically dispatched to <strong>{panel.length} selected validators</strong>. 
                The system is now awaiting their consensus signals.
              </p>

              <div className="bg-[#05030A] p-4 rounded border border-white/5 mb-6 shadow-inner">
                <h4 className="text-[10px] uppercase font-bold text-gray-500 mb-2 tracking-widest">Live Dispatch Log</h4>
                <div className="text-xs font-mono text-gray-400 max-h-32 overflow-y-auto space-y-1 custom-scrollbar">
                  {panel.slice(0,5).map((v, i) => (
                    <div key={i} className="flex justify-between items-center bg-white/5 px-2 py-1 rounded">
                      <span className="truncate pr-4 text-gray-300">{v.email}</span>
                      <span className="text-emerald-400 font-semibold flex-shrink-0">Delivered</span>
                    </div>
                  ))}
                  <div className="text-center text-gray-500 italic mt-2 text-[11px]">...and {panel.length - 5} more</div>
                </div>
              </div>

              <div className="pt-4 border-t border-white/10">
                <p className="text-[10px] text-gray-500 mb-2 font-bold uppercase tracking-widest">Developer Sandbox Actions:</p>
                <div className="flex flex-col gap-2">
                  <button onClick={copyVotingLink} className="w-full btn bg-white text-black font-bold text-xs py-2.5 flex justify-center items-center gap-2 hover:bg-gray-200 transition-colors rounded-md shadow-sm">
                    <ExternalLink className="w-4 h-4" /> Copy Direct Voting Link (To Test UI)
                  </button>
                  <button onClick={() => navigate(`/voting/${roundId}`)} className="w-full btn bg-white/5 hover:bg-white/10 text-white border border-white/10 rounded-md text-xs font-semibold py-2 transition-colors">
                    Open Live Validator Dashboard
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </div>

        {/* ─── RIGHT COLUMN: THE CLAIM LEDGER ─── */}
        <div className="lg:col-span-2">
          {/* Include DIVGScene in the right column if we are in Firm Portal mode (since Hero is hidden) */}
          {isFirmPortal && (
            <div className="card p-2 mb-6 hidden lg:block border-white/10 bg-black/20">
              <DIVGScene data={{ mode: 'claim', claimsCount: claims.length }} height={280} />
            </div>
          )}

          <div className="card p-5 h-full max-h-[800px] flex flex-col bg-black/40 border border-white/10">
            <div className="flex items-center justify-between mb-4 flex-shrink-0">
              <div className="flex items-center gap-2 text-sky-400">
                <FileText className="w-4 h-4" />
                <h2 className="font-semibold text-sm uppercase tracking-wider">Public Claim Ledger</h2>
              </div>
              <span className="text-[10px] mono text-gray-500 tracking-widest">{claims.length} CLAIMS</span>
            </div>
            
            <div className="space-y-2 overflow-y-auto pr-2 flex-1 custom-scrollbar">
              {claims.length === 0 && <div className="text-xs text-gray-500 text-center py-12 mono">No claims yet.</div>}
              {claims.slice().reverse().map((c) => (
                <div key={c.claim_id} className="border border-white/5 rounded-md p-3 bg-white/5 hover:border-sky-500/30 transition-all">
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="font-semibold text-xs text-white">{c.firm_name}</div>
                    <span className={`text-[9px] px-2 py-0.5 rounded mono uppercase tracking-wider border ${c.status === 'complete' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-amber-500/10 text-amber-400 border-amber-500/20'}`}>
                      {c.status}
                    </span>
                  </div>
                  <p className="text-[11px] text-gray-400 leading-relaxed line-clamp-2 mb-2">{c.description}</p>
                  <div className="text-[9px] mono text-gray-500 flex items-center gap-1">
                    <Hash className="w-2.5 h-2.5" /> {c.claim_hash.slice(0, 24)}...
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>

      {/* SMART NAVIGATION IMPLEMENTED PERFECTLY HERE */}
      <div className="sticky bottom-0 mt-8 -mx-4 sm:-mx-6 px-4 sm:px-6 py-3 bg-[#0C0518]/90 backdrop-blur-md border-t border-white/10 z-40">
        <PortalNavigation />
      </div>

    </div>
  );
}

// Sub-component for numbers
function NumField({ label, value, onChange }: { label: string, value: number, onChange: (v: number) => void }) {
  return (
    <div>
      <label className="block text-[10px] mono uppercase tracking-wide text-gray-500 mb-1.5">{label}</label>
      <input type="number" value={value} onChange={(e) => onChange(Number(e.target.value))}
        className="w-full border border-white/10 rounded-md px-3 py-2 text-sm bg-[#05030A] text-white focus:ring-1 focus:ring-sky-500 outline-none" />
    </div>
  );
}