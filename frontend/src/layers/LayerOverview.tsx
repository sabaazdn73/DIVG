import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, LucideIcon } from 'lucide-react';
import { useEffect, useState } from 'react';
import { apiHealth, apiSeed, apiRegistry } from '../lib/api';
import DIVGScene, { SceneValidator } from '../components/DIVGScene';
import SignatureGlobe from '../components/SignatureGlobe';
import { apiReset } from '../lib/api';

type Layer = { path: string; label: string; desc: string; color: string; icon: LucideIcon; };

export default function LayerOverview({ layers }: { layers: Layer[] }) {
  const [health, setHealth] = useState<any>(null);
  const [seeding, setSeeding] = useState(false);
  const [validators, setValidators] = useState<SceneValidator[]>([]);

  async function refresh() {
    try {
      const h = await apiHealth(); setHealth(h);
      const r = await apiRegistry();
      setValidators((r.validators ?? []).map((v: any) => ({
        group: v.group, reputation: v.reputation, phase: 'selected' as const,
      })));
    } catch {}
  }
  useEffect(() => { refresh(); }, []);

  async function handleSeed() {
    setSeeding(true);
    await apiSeed().catch(console.error);
    await refresh();
    setSeeding(false);
  }


  return (
    <div className="max-w-7xl mx-auto px-6 py-10 relative">
      {/* personal signature globe — sits behind the hero */}
      <SignatureGlobe opacity={0.28} rightOffset="1" />

      <div className="relative" style={{ zIndex: 1 }}>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center mb-10">
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
          
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4 leading-[1.05]">
            A decentralised<br/>verification graph<br/>
            <span className="text-muted">for impact claims.</span>
          </h1>
          <p className="text-sm text-muted max-w-xl leading-relaxed mb-6">
            DIVG integrates Self-Sovereign Identity, DAO-informed validator governance,
            and the Compact Shadow Private-Prior Peer Prediction mechanism (Witkowski &amp;
            Parkes, 2012) across SUI and Hedera Consensus Service. Fully open sandbox &mdash;
            register any entities, submit any claims, run unlimited validation rounds.
          </p>
          <div className="flex items-center gap-3">
            <Link to="/registry" className="btn btn-primary flex items-center gap-2">
              Enter the sandbox <ArrowRight className="w-4 h-4" />
            </Link>
            <button onClick={handleSeed} disabled={seeding} className="btn btn-secondary disabled:opacity-50">
              {seeding ? 'Seeding...' : 'Seed Winnow / MSM example'}
            </button>

            <button onClick={async () => { await apiReset(); await refresh(); }}
              className="btn btn-secondary disabled:opacity-50">
              Reset sandbox
            </button>
          
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.5 }}
          className="card p-2">
          <DIVGScene data={{ mode: 'overview', validators }} height={400} />
          <div className="px-3 pb-2 text-[10px] mono text-muted text-center">
            drag to rotate &middot; live topology &middot; {validators.length} validators in pool
          </div>
        </motion.div>
      </div>

      <div className="card p-4 mb-8 flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-6 text-xs">
          <span className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${health ? 'bg-hedera' : 'bg-muted'}`} />
            <span className="mono text-muted uppercase tracking-wide">{health ? 'backend live' : 'connecting'}</span>
          </span>
          {health && (
            <>
              <Stat label="validators" value={health.counts.validators} />
              <Stat label="claims" value={health.counts.claims} />
              <Stat label="VICs" value={health.counts.vics} />
              {health.package_id && health.package_id !== 'not-deployed' && (
                <span className="mono text-muted text-[10px]">pkg {health.package_id.slice(0, 10)}...</span>
              )}
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {layers.map((l, i) => (
          <motion.div key={l.path} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: 0.05 * i }}>
            <Link to={l.path} className="card p-5 block hover:shadow-md transition-all group h-full">
              <div className="flex items-center justify-between mb-4">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: `var(--clr-${l.color})` }}>
                  <l.icon className="w-5 h-5 text-white" strokeWidth={2.2} />
                </div>
                <span className="text-[10px] mono tracking-widest text-muted">0{i + 1}</span>
              </div>
              <h3 className="font-semibold text-sm mb-1">{l.label}</h3>
              <p className="text-xs text-muted leading-relaxed mb-4">{l.desc}</p>
              <div className="flex items-center text-xs mono text-muted group-hover:text-ink transition-colors">
                Enter <ArrowRight className="w-3 h-3 ml-1" />
              </div>
            </Link>
          </motion.div>
        ))}
      </div>

      <style>{`
        :root {
          --clr-firm:#0F6E56; --clr-claim:#0284C7; --clr-pool:#64748B;
          --clr-val:#2563EB; --clr-vic:#7C3AED; --clr-hedera:#16A34A; --clr-invest:#4F46E5;
        }
      `}</style>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return <span className="mono text-muted">{label}: <span className="text-ink font-semibold">{value}</span></span>;
}
