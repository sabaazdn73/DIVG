import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, CheckCircle2, AlertTriangle, Info } from 'lucide-react';
import { apiVics, apiAdvisory, VIC } from '../lib/api';
import { Hero } from './LayerRegistry';
import DIVGScene from '../components/DIVGScene';
import { LayerGuide } from '../components/LayerGuide';

export default function LayerInvestor() {
  const [vics, setVics] = useState<VIC[]>([]);
  const [vicId, setVicId] = useState('');
  const [theta, setTheta] = useState(0.7);
  const [result, setResult] = useState<any>(null);

  useEffect(() => {
    apiVics().then(r => { setVics(r.vics); if (r.vics.length) setVicId(r.vics[r.vics.length - 1].vic_id); });
  }, []);

  async function query() {
    if (!vicId) return;
    const r = await apiAdvisory({ vic_id: vicId, theta });
    setResult(r);
  }
  const selectedVic = vics.find(v => v.vic_id === vicId);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
      <Hero n="05" title="Advisory Layer"
        sub="sigma(C) = 1 if D_final = 1 AND Conf(c) >= theta, else 0. Strictly advisory - DIVG never restricts publication. Each investor sets their own threshold." />

      <div className="card p-2 mb-6">
        <DIVGScene data={{
          mode: 'investor',
          confidence: selectedVic?.confidence ?? 0.5,
          dFinal: selectedVic?.d_final ?? 0,
          theta,
          sigma: result ? result.sigma : null,
          approved: selectedVic?.validators_approved ?? 0,
          total: selectedVic?.total_validators ?? 12,
          firmName: selectedVic?.firm_did,
        }} height={700} />
        <div className="px-3 pb-2 text-[10px] mono text-muted text-center">
          full verification graph &middot; firm &rarr; claim &rarr; validators &rarr; VIC &rarr; Hedera &middot; orb colour = your &sigma;(C) result
        </div>
      </div>

      <LayerGuide
        color="#4F46E5"
        insert={<>
          <p>Select a VIC to evaluate. Drag the <b>risk-tolerance &theta;</b> slider to your own threshold.</p>
          <p>Click <b>Compute &sigma;(C)</b>. The result appears as a green (proceed) or amber (caution) orb in the graph and a panel on the right.</p>
        </>}
        interpret={<>
          <p><b>&sigma;(C) = 1 (PROCEED)</b> when D_final = 1 AND confidence &ge; your &theta;. Otherwise <b>&sigma;(C) = 0 (CAUTION)</b>.</p>
          <p>Raise &theta; to be stricter; lower it to be more lenient. The same VIC can read proceed for one investor and caution for another.</p>
          <p>Crucially, &sigma;(C) is <b>strictly advisory</b> &mdash; it never blocks the claim. Each investor decides independently from the same on-chain evidence.</p>
        </>}
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card p-6">
          <h2 className="font-semibold text-sm mb-4 flex items-center gap-2"><TrendingUp className="w-4 h-4 text-invest" /> Investor query</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-[10px] mono uppercase tracking-wide text-muted mb-1.5">VIC to evaluate</label>
              <select value={vicId} onChange={(e) => { setVicId(e.target.value); setResult(null); }}
                className="w-full border border-border rounded-md px-3 py-2 text-sm bg-white">
                <option value="">-- select VIC --</option>
                {vics.map(v => <option key={v.vic_id} value={v.vic_id}>{v.vic_id.slice(0, 12)} &middot; D={v.d_final} &middot; {(v.confidence * 100).toFixed(1)}%</option>)}
              </select>
            </div>
            <div>
              <label className="flex items-center justify-between text-[10px] mono uppercase tracking-wide text-muted mb-1.5">
                <span>Risk-tolerance theta</span><span className="text-invest font-bold normal-case text-base">{theta.toFixed(2)}</span>
              </label>
              <input type="range" min={0} max={1} step={0.05} value={theta}
                onChange={(e) => { setTheta(Number(e.target.value)); setResult(null); }} className="w-full accent-invest" />
              <div className="flex justify-between text-[10px] mono text-muted mt-1"><span>lenient</span><span>strict</span></div>
            </div>
            <button onClick={query} disabled={!vicId} className="btn btn-primary w-full disabled:opacity-50">Compute sigma(C)</button>
          </div>
          {selectedVic && (
            <div className="mt-5 pt-5 border-t border-border">
              <div className="text-[10px] mono uppercase tracking-wide text-muted mb-2">VIC under review</div>
              <div className="text-xs mono space-y-1">
                <div>D_final: <span className="font-bold">{selectedVic.d_final}</span></div>
                <div>Conf(c): <span className="font-bold">{(selectedVic.confidence * 100).toFixed(2)}%</span></div>
                <div>S_agg: <span className="font-bold">{selectedVic.s_agg.toFixed(3)}</span></div>
              </div>
            </div>
          )}
        </div>

        <div className={`card p-6 transition-all ${result?.sigma === 1 ? 'border-hedera/40 bg-hedera/5' : result?.sigma === 0 ? 'border-amber-300 bg-amber-50' : ''}`}>
          <h2 className="font-semibold text-sm mb-4 flex items-center gap-2"><Info className="w-4 h-4" /> Advisory output</h2>
          {!result && <div className="text-xs text-muted text-center py-16 mono">Select a VIC and threshold, then compute sigma(C).</div>}
          {result && (
            <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }}>
              <div className={`text-center py-6 rounded-lg ${result.sigma === 1 ? 'bg-hedera/10' : 'bg-amber-100'}`}>
                {result.sigma === 1 ? (
                  <><CheckCircle2 className="w-12 h-12 mx-auto mb-3 text-hedera" />
                    <div className="text-3xl font-bold text-hedera">sigma(C) = 1</div>
                    <div className="text-sm text-hedera/80 mt-1 mono">PROCEED - claim meets your criteria</div></>
                ) : (
                  <><AlertTriangle className="w-12 h-12 mx-auto mb-3 text-amber-600" />
                    <div className="text-3xl font-bold text-amber-700">sigma(C) = 0</div>
                    <div className="text-sm text-amber-700/80 mt-1 mono">CAUTION - further diligence advised</div></>
                )}
              </div>
              <div className="mt-4 space-y-2 text-xs mono">
                <Row k="D_final" v={result.d_final} target="= 1" hit={result.d_final === 1} />
                <Row k="Conf(c)" v={result.confidence.toFixed(3)} target={`>= ${theta.toFixed(2)}`} hit={result.confidence >= theta} />
              </div>
              <p className="text-[11px] text-muted mt-5 leading-relaxed">
                sigma(C) is strictly advisory. DIVG does not restrict claim publication. Each investor evaluates the
                VIC's embedded metadata against their own threshold and decides independently.
              </p>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}

function Row({ k, v, target, hit }: any) {
  return (
    <div className="flex items-center justify-between py-1.5 border-b border-border/50 last:border-0">
      <span className="text-muted">{k}</span>
      <span className="flex items-center gap-2"><span className="font-bold">{v}</span>
        {target && <span className={`text-[10px] ${hit ? 'text-hedera' : 'text-amber-600'}`}>({target})</span>}</span>
    </div>
  );
}
