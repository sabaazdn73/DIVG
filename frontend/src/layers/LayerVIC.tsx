import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Award, ExternalLink, Shield } from 'lucide-react';
import { apiVics, VIC } from '../lib/api';
import { Hero } from './LayerRegistry';
import DIVGScene from '../components/DIVGScene';
import { LayerGuide } from '../components/LayerGuide';
import VICertificate from '../components/VICertificate';

export default function LayerVIC() {
  const [vics, setVics] = useState<VIC[]>([]);
  const [active, setActive] = useState<VIC | null>(null);

  useEffect(() => {
    apiVics().then(r => { setVics(r.vics); if (r.vics.length) setActive(r.vics[r.vics.length - 1]); });
  }, []);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
      <Hero n="04" title="Credential Layer"
        sub="VIC minted unconditionally for every round. D_final, Conf(c), S_agg are embedded metadata, not minting gates. The platform is a non-custodial transparency layer." />

      <div className="card p-2 mb-6">
        <DIVGScene data={{ mode: 'vic', vicsCount: vics.length, confidence: active?.confidence ?? 0.5, dFinal: active?.d_final ?? 0 }} height={360} />
        <div className="px-3 pb-2 text-[10px] mono text-muted text-center">
          VIC icosahedron anchored to SUI (cube) + Hedera (tetrahedron) &middot; {vics.length} minted
        </div>
      </div>

      <LayerGuide
        color="#7C3AED"
        insert={<>
          <p>This layer is read-only &mdash; VICs are minted automatically when you run a validation round.</p>
          <p>Click any VIC in the left list to inspect it. The most recent one is selected by default.</p>
        </>}
        interpret={<>
          <p>A <b>VIC</b> (Verifiable Impact Credential) is minted <b>unconditionally</b> for every round &mdash; even contested claims. Consensus is embedded as metadata, never a gate.</p>
          <p><b>D=1 vs D=0</b> tells you whether there was high consensus, but both still produce a credential.</p>
          <p>Each VIC is anchored <b>twice</b>: as a SUI object (current state) and a Hedera HCS log entry (audit history) &mdash; verify it either way without trusting the platform.</p>
        </>}
      />

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-1">
          <div className="card p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-sm flex items-center gap-2"><Award className="w-4 h-4 text-vic" /> VICs</h2>
              <span className="text-xs mono text-muted">{vics.length}</span>
            </div>
            <div className="space-y-2 max-h-[520px] overflow-y-auto">
              {vics.length === 0 && <div className="text-xs text-muted text-center py-12 mono">No VICs minted yet.</div>}
              {vics.slice().reverse().map((v) => (
                <button key={v.vic_id} onClick={() => setActive(v)}
                  className={`w-full text-left border rounded-md p-3 transition-all ${active?.vic_id === v.vic_id ? 'border-vic bg-vic/5' : 'border-border hover:bg-panel'}`}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-semibold text-xs">VIC {v.vic_id.slice(0, 8)}</span>
                    <span className={`pill text-[9px] ${v.d_final ? 'bg-vic/10 text-vic' : 'bg-slate-100 text-muted'}`}>D = {v.d_final}</span>
                  </div>
                  <div className="text-[10px] mono text-muted">Conf {(v.confidence * 100).toFixed(1)}% &middot; {v.validators_approved}/{v.total_validators}</div>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="lg:col-span-3">
          {active ? (
            <motion.div key={active.vic_id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}>
              <div className="card p-6 mb-4 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-40 h-40 bg-vic/5 rounded-full -translate-y-20 translate-x-20" />
                <div className="relative">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <div className="w-10 h-10 rounded-lg bg-vic flex items-center justify-center"><Award className="w-5 h-5 text-white" /></div>
                      <div>
                        <div className="text-[10px] mono uppercase tracking-wide text-muted">Verifiable Impact Credential</div>
                        <h2 className="font-bold text-lg">{active.vic_id.slice(0, 16)}...</h2>


                      {active.walrus_blob_id ? (
                        <button
                          onClick={() => {
                            const url = `${window.location.origin}/vic/walrus/${active.walrus_blob_id}`;
                            navigator.clipboard.writeText(url);
                          }}
                          className="text-[10px] mono px-2 py-1 rounded bg-vic/10 text-vic hover:bg-vic/20 transition-colors"
                        >
                            Copy Share Link (Walrus)
                        </button>
                      ) : (
                        <span className="text-[10px] mono text-muted">No Walrus blob (run a fresh round)</span>
                      )}

                          
                      </div>
                    </div>
                    <span className={`pill px-3 py-1.5 ${active.d_final ? 'bg-vic text-white' : 'bg-slate-200 text-slate-700'}`}>
                      {active.d_final ? 'HIGH CONSENSUS (D=1)' : 'LOW CONSENSUS (D=0)'}</span>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-6">
                    <Metric label="Confidence" value={`${(active.confidence * 100).toFixed(1)}%`} accent />
                    <Metric label="S_agg" value={active.s_agg.toFixed(3)} />
                    <Metric label="Approved" value={`${active.validators_approved}/${active.total_validators}`} />
                    <Metric label="Rounds" value={active.round_count} />
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <ChainCard network="SUI Testnet" color="vic" desc="VIC object minted unconditionally" fields={[
                  { l: 'Object state', v: 'shared' },
                  { l: 'Transaction', v: (active.sui_digest?.slice(0, 30) || 'simulated') + '...' },
                  { l: 'Firm DID', v: active.firm_did.slice(0, 24) + '...' },
                ]} link={active.sui_digest && !active.sui_digest.startsWith('sim-') ? `https://suiscan.xyz/testnet/tx/${active.sui_digest}` : null} />
                <ChainCard network="Hedera HCS" color="hedera" desc="Independent audit trail" fields={[
                  { l: 'Topic ID', v: active.hedera_topic_id || 'pending' },
                  { l: 'Sequence', v: String(active.hedera_sequence) },
                  { l: 'Ordering', v: 'fair, sub-second' },
                ]} link={active.hedera_topic_id && !active.hedera_topic_id.includes('SIM') ? `https://hashscan.io/testnet/topic/${active.hedera_topic_id}` : null} />
              </div>
              <div className="card p-5 mt-4 bg-panel">
                <div className="flex items-center gap-2 mb-2"><Shield className="w-4 h-4 text-ink" />
                  <h3 className="font-semibold text-sm">Dual-path verification</h3></div>
                <p className="text-xs text-muted leading-relaxed">
                  An investor verifies this VIC through three independent paths without trusting the DIVG operator:
                  the SUI object for current state, the Hedera HCS log for the complete validation history,
                  and the Walrus blob for the full credential record — retrievable even if this backend goes offline.
                </p>
              </div>
              <div className="mt-6">
                <VICertificate vic={active} />
              </div>
            </motion.div>
          ) : (
            <div className="card p-12 text-center">
              <Award className="w-12 h-12 mx-auto text-muted opacity-40 mb-3" />
              <p className="text-sm text-muted">No VIC selected. Run a validation round.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Metric({ label, value, accent }: any) {
  return (
    <div>
      <div className="text-[10px] mono uppercase tracking-wide text-muted mb-1">{label}</div>
      <div className={`text-2xl font-bold ${accent ? 'text-vic' : ''}`}>{value}</div>
    </div>
  );
}

function ChainCard({ network, color, desc, fields, link }: any) {
  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-3">
        <div>
          <div className="pill" style={{ background: color === 'vic' ? 'rgba(124,58,237,0.1)' : 'rgba(22,163,74,0.1)', color: color === 'vic' ? '#7C3AED' : '#16A34A' }}>{network}</div>
          <p className="text-[11px] text-muted mt-1.5">{desc}</p>
        </div>
        {link && <a href={link} target="_blank" rel="noopener noreferrer" className="text-muted hover:text-ink"><ExternalLink className="w-4 h-4" /></a>}
      </div>
      <div className="space-y-1.5 mt-3">
        {fields.map((f: any, i: number) => (
          <div key={i} className="flex items-start justify-between text-[11px] mono">
            <span className="text-muted">{f.l}</span><span className="text-right break-all max-w-[60%]">{f.v}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
