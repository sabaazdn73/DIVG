import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { FileText, Hash, ArrowRight, Plus, CheckCircle2, RotateCcw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { apiRegistry, apiSubmitClaim, apiClaims, Claim } from '../lib/api';
import { Hero } from './LayerRegistry';
import DIVGScene from '../components/DIVGScene';

const EMPTY = {
  description: '', tonnes_food_saved: 0, co2e_prevented: 0, sites: 0, period: '',
};

export default function LayerClaim() {
  const [firms, setFirms]   = useState<any[]>([]);
  const [claims, setClaims] = useState<Claim[]>([]);
  const [firmDid, setFirmDid] = useState('');
  const [form, setForm] = useState<any>({ ...EMPTY });
  const [pending, setPending] = useState(false);
  const [last, setLast] = useState<any>(null);
  const navigate = useNavigate();

  async function load() {
    const r = await apiRegistry();
    setFirms(r.firms);
    if (r.firms.length > 0 && !firmDid) setFirmDid(r.firms[0].did);
    const c = await apiClaims();
    setClaims(c.claims);
  }
  useEffect(() => { load(); }, []);

  function fillWinnowExample() {
    setForm({
      description: 'Winnow AI-driven food waste monitoring reduced waste by 47% across 120 hospitality sites in Portugal and Spain in Q1 2025, saving an estimated 380 tonnes of food and preventing ~1,140 tonnes of CO2e.',
      tonnes_food_saved: 380, co2e_prevented: 1140, sites: 120, period: 'Q1 2025',
    });
  }

  async function submit(e: any) {
    e.preventDefault();
    if (!firmDid) return;
    setPending(true);
    try {
      const { description, ...claim_data } = form;
      const res = await apiSubmitClaim({ firm_did: firmDid, description, claim_data });
      setLast(res);
      setForm({ ...EMPTY });          // reset so you can submit another immediately
      await load();
    } catch (e: any) { alert(e?.response?.data?.error || e.message); }
    finally { setPending(false); }
  }

  return (
    <div className="max-w-7xl mx-auto px-6 py-10">
      <Hero n="02" title="Claim Layer"
        sub="Any registered firm can submit unlimited impact claims. Each is hashed (SHA-256), anchored on SUI, and logged to Hedera HCS. Submit as many as you like." />

      <div className="card p-2 mb-6">
        <DIVGScene data={{ mode: 'claim', claimsCount: claims.length }} height={520} />
        <div className="px-3 pb-2 text-[10px] mono text-muted text-center">
          firm node emitting claim crystals &middot; {claims.length} claims anchored
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="lg:col-span-3">
          <div className="card p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2"><Plus className="w-4 h-4 text-claim" />
                <h2 className="font-semibold text-sm">Submit impact claim</h2></div>
              <button onClick={fillWinnowExample} className="text-[11px] mono text-muted hover:text-ink flex items-center gap-1">
                <RotateCcw className="w-3 h-3" /> fill Winnow example
              </button>
            </div>
            <form onSubmit={submit} className="space-y-3">
              <div>
                <label className="block text-[10px] mono uppercase tracking-wide text-muted mb-1.5">Issuing firm</label>
                <select value={firmDid} onChange={(e) => setFirmDid(e.target.value)}
                  className="w-full border border-border rounded-md px-3 py-2 text-sm bg-white" required>
                  <option value="">-- select firm --</option>
                  {firms.map(f => <option key={f.did} value={f.did}>{f.full_name} &middot; {f.did.slice(-10)}</option>)}
                </select>
                {firms.length === 0 && (
                  <p className="text-[11px] text-amber-700 mt-1.5">
                    No firms registered. Register a firm in Layer 01, or seed the Winnow example.
                  </p>
                )}
              </div>
              <div>
                <label className="block text-[10px] mono uppercase tracking-wide text-muted mb-1.5">Claim description</label>
                <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Describe the impact claim to be verified..."
                  className="w-full border border-border rounded-md px-3 py-2 text-sm h-28 resize-none focus:outline-none focus:ring-2 focus:ring-ink/10" required />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <NumField label="Tonnes saved" value={form.tonnes_food_saved} onChange={(v) => setForm({ ...form, tonnes_food_saved: v })} />
                <NumField label="CO2e prevented (t)" value={form.co2e_prevented} onChange={(v) => setForm({ ...form, co2e_prevented: v })} />
                <NumField label="Sites" value={form.sites} onChange={(v) => setForm({ ...form, sites: v })} />
                <div>
                  <label className="block text-[10px] mono uppercase tracking-wide text-muted mb-1.5">Period</label>
                  <input value={form.period} onChange={(e) => setForm({ ...form, period: e.target.value })}
                    placeholder="e.g. Q1 2025" className="w-full border border-border rounded-md px-3 py-2 text-sm" />
                </div>
              </div>
              <button type="submit" disabled={pending || !firmDid} className="btn btn-primary w-full disabled:opacity-50 mt-2">
                {pending ? 'Anchoring on SUI + Hedera...' : 'Submit claim on-chain'}
              </button>
            </form>
            {last && (
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                className="mt-4 p-4 bg-claim/5 border border-claim/20 rounded-md">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle2 className="w-4 h-4 text-claim" />
                  <span className="font-semibold text-sm text-claim">Claim anchored &mdash; submit another or validate</span>
                </div>
                <div className="text-xs mono space-y-1">
                  <div><span className="text-muted">claim_id:</span> {last.claim.claim_id}</div>
                  <div><span className="text-muted">hash:</span> {last.claim.claim_hash.slice(0, 32)}...</div>
                  <div><span className="text-muted">HCS seq:</span> {last.hcs.sequence}</div>
                </div>
                <button onClick={() => navigate('/round')} className="btn btn-primary w-full mt-3 text-xs">
                  Run validation round <ArrowRight className="w-3 h-3 inline ml-1" />
                </button>
              </motion.div>
            )}
          </div>
        </div>

        <div className="lg:col-span-2">
          <div className="card p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2"><FileText className="w-4 h-4 text-claim" />
                <h2 className="font-semibold text-sm">Claim ledger</h2></div>
              <span className="text-xs mono text-muted">{claims.length} claims</span>
            </div>
            <div className="space-y-2 max-h-[560px] overflow-y-auto pr-2">
              {claims.length === 0 && <div className="text-xs text-muted text-center py-12 mono">No claims yet.</div>}
              {claims.slice().reverse().map((c) => (
                <div key={c.claim_id} className="border border-border rounded-md p-3">
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="font-semibold text-xs">{c.firm_name}</div>
                    <span className={`pill ${c.status === 'complete' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                      {c.status}</span>
                  </div>
                  <p className="text-[11px] text-muted leading-relaxed line-clamp-2 mb-2">{c.description}</p>
                  <div className="text-[10px] mono text-muted flex items-center gap-1">
                    <Hash className="w-2.5 h-2.5" /> {c.claim_hash.slice(0, 24)}...</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function NumField({ label, value, onChange }: any) {
  return (
    <div>
      <label className="block text-[10px] mono uppercase tracking-wide text-muted mb-1.5">{label}</label>
      <input type="number" value={value} onChange={(e) => onChange(Number(e.target.value))}
        className="w-full border border-border rounded-md px-3 py-2 text-sm" />
    </div>
  );
}
