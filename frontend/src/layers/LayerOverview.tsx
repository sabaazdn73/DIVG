import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, LucideIcon } from 'lucide-react';
import { useEffect, useState } from 'react';
import { apiHealth, apiSeed, apiRegistry, apiReset } from '../lib/api';
import DIVGScene, { SceneValidator } from '../components/DIVGScene';


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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-10 relative">
      {/* personal signature globe — sits behind the hero */}

      <div className="relative" style={{ zIndex: 1 }}>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center mb-10">
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
          
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight mb-4 leading-[1.15] text-white">
            A Verification Infrastructure<br/>for the Next Generation of Impact Finance
            </h1>
            <p className="text-sm sm:text-base text-muted font-medium tracking-tight mb-4 leading-snug">
              Regenerative Finance &mdash; ReFi, Impact Investing, and Outcome-Based Funding
              </p>

          <p className="text-sm text-muted max-w-xl leading-relaxed mb-6">
            DIVG integrates Self-Sovereign Identity, DAO-informed validator governance,
            and the Compact Shadow Private-Prior Peer Prediction mechanism (Witkowski &amp;
            Parkes, 2012) across SUI and Hedera Consensus Service. Fully open sandbox &mdash;
            register any entities, submit any claims, run unlimited validation rounds.
          </p>
          
          {/* ADDED flex-wrap AND THE NEW B2B PORTAL BUTTON HERE */}
          <div className="flex items-center flex-wrap gap-3">
            
            {/* NEW B2B PORTAL LINK */}
            <Link to="/portal" className="btn bg-purple-600 hover:bg-purple-500 text-white flex items-center gap-2 shadow-[0_0_15px_rgba(147,51,234,0.4)] border border-purple-500/50 transition-all font-semibold">
              Launch B2B Portal <ArrowRight className="w-4 h-4" />
            </Link>

            <Link to="/registry" className="btn btn-primary flex items-center gap-2 shadow-[0_0_15px_rgba(255,255,255,0.2)]">
              Enter the sandbox <ArrowRight className="w-4 h-4" />
            </Link>
            <button onClick={handleSeed} disabled={seeding} className="btn btn-secondary disabled:opacity-50">
              {seeding ? 'Seeding...' : 'Seed Winnow / MSM example'}
            </button>

            <button onClick={async () => { await apiReset(); await refresh(); }}
              className="btn btn-secondary text-red-400 border-red-500/20 hover:bg-red-500/10 disabled:opacity-50">
              Reset sandbox
            </button>

          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.5 }}
          className="card p-2 bg-black/20">
          <DIVGScene data={{ mode: 'overview', validators }} height={400} />
          <div className="px-3 pb-2 text-[10px] mono text-muted text-center tracking-widest uppercase">
            drag to rotate &middot; live topology &middot; {validators.length} validators in pool
          </div>
        </motion.div>
      </div>

      <div className="card p-4 mb-8 flex items-center justify-between flex-wrap gap-3 bg-black/40">
        <div className="flex items-center gap-6 text-xs">
          <span className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full shadow-[0_0_8px_currentColor] ${health ? 'bg-hedera text-hedera' : 'bg-muted text-muted'}`} />
            <span className="mono text-muted uppercase tracking-widest">{health ? 'backend live' : 'connecting'}</span>
          </span>
          {health && (
            <>
              <Stat label="validators" value={health.counts.validators} />
              <Stat label="claims" value={health.counts.claims} />
              <Stat label="VICs" value={health.counts.vics} />
              {health.package_id && health.package_id !== 'not-deployed' && (
                <span className="mono text-muted text-[10px] bg-white/5 px-2 py-1 rounded border border-white/5">pkg {health.package_id.slice(0, 10)}...</span>
              )}
            </>
          )}
        </div>
      </div>

      {/* UPDATED GRID RESPONSIVENESS HERE */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
        {layers.map((l, i) => (
          <motion.div key={l.path} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: 0.05 * i }}>
            <Link to={l.path} className="card p-5 block hover:shadow-[0_8px_30px_rgb(0,0,0,0.5)] transition-all group h-full relative overflow-hidden">
              <div className="absolute inset-0 bg-white/0 group-hover:bg-white/5 transition-colors duration-300" />
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-5">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center relative group-hover:scale-110 transition-transform duration-300"
                    style={{ 
                      backgroundColor: `color-mix(in srgb, var(--clr-${l.color}) 15%, transparent)`, 
                      border: `1px solid color-mix(in srgb, var(--clr-${l.color}) 30%, transparent)`,
                      boxShadow: `0 0 20px color-mix(in srgb, var(--clr-${l.color}) 20%, transparent)` 
                    }}>
                    <l.icon className="w-6 h-6 transition-all duration-300 drop-shadow-[0_0_8px_currentColor]" 
                            style={{ color: `var(--clr-${l.color})` }} 
                            strokeWidth={1.5} />
                  </div>
                  <span className="text-[10px] mono tracking-widest text-muted group-hover:text-white transition-colors">0{i + 1}</span>
                </div>
                <h3 className="font-semibold text-sm mb-1 text-white">{l.label}</h3>
                <p className="text-xs text-muted leading-relaxed mb-4">{l.desc}</p>
                <div className="flex items-center text-[11px] mono text-muted group-hover:text-teal-400 transition-colors uppercase tracking-widest mt-auto">
                  Enter <ArrowRight className="w-3 h-3 ml-1" />
                </div>
              </div>
            </Link>
          </motion.div>
        ))}
      </div>

      <style>{`
        :root {
          --clr-firm:   #2dd4bf; 
          --clr-claim:  #38bdf8; 
          --clr-pool:   #94a3b8;
          --clr-val:    #818cf8; 
          --clr-vic:    #c084fc; 
          --clr-hedera: #34d399; 
          --clr-invest: #fbbf24;
          --clr-vote:   #fb923c; 
        }
      `}</style>
      
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return <span className="mono text-muted">{label}: <span className="text-white font-semibold">{value}</span></span>;
}