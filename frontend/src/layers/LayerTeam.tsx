import { useState } from 'react';
import { motion } from 'framer-motion';
import { Github, Linkedin, Network, Code, AreaChart, Fingerprint, Sparkles, Database, Palette, FileCode2 } from 'lucide-react';

export default function LayerTeam() {
  const [active, setActive] = useState<'saba' | 'omid'>('saba');

  return (
    <div className="min-h-screen bg-[#0C0518] relative overflow-hidden flex flex-col font-['Inter',sans-serif] text-gray-100">

      {/* Abstract Background Elements */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-teal-500/10 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-purple-500/10 blur-[120px] rounded-full pointer-events-none" />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12 sm:py-20 w-full relative z-10 flex-1">

        {/* Header Section */}
        <div className="text-center mb-16 lg:mb-24">
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
            <div className="text-[10px] mono tracking-[0.2em] text-teal-400 mb-3 uppercase flex items-center justify-center gap-2">
              <Sparkles className="w-3 h-3" /> The Architects
            </div>
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4 text-white font-['Pixelify_Sans',monospace]">
              Meet the Team
            </h1>
            <p className="text-sm text-gray-400 max-w-2xl mx-auto leading-relaxed">
              Merging decentralized ledger technology with rigorous, outcome-based impact measurement to solve the institutional impact-washing crisis.
            </p>
          </motion.div>
        </div>

        {/* Overlapping Cards Container */}
        <div className="flex flex-col lg:flex-row items-center justify-center gap-8 lg:gap-0 mt-8">

          {/* ================= SABA'S CARD ================= */}
          <motion.div
            initial={{ opacity: 0, x: -30, y: 20 }}
            animate={{ opacity: 1, x: 0, y: 0 }}
            transition={{ delay: 0.1, duration: 0.6 }}
            onClick={() => setActive('saba')}
            className={`w-full lg:w-[480px] bg-black/60 border rounded-2xl p-8 relative overflow-hidden transition-all duration-300 cursor-pointer shadow-2xl backdrop-blur-xl
              ${active === 'saba'
                ? 'z-50 lg:scale-105 border-teal-500 shadow-[0_0_50px_rgba(45,212,191,0.2)]'
                : 'z-10 scale-100 border-white/10 hover:border-teal-500/30 hover:-translate-y-1 opacity-90'}`}
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-teal-500/10 rounded-full blur-3xl transition-opacity opacity-50" />

            <div className="flex flex-col sm:flex-row gap-6 items-center sm:items-start mb-6">
              <div className="w-28 h-28 rounded-2xl bg-[#05030A] border border-teal-500/30 shadow-[0_0_15px_rgba(45,212,191,0.2)] overflow-hidden flex-shrink-0 relative transition-transform duration-500">
                <img src="/saba.jpg" alt="Saba Azadegan" className="w-full h-full object-cover"
                     onError={(e) => { e.currentTarget.src = 'https://ui-avatars.com/api/?name=Saba+A&background=0D1117&color=2DD4BF&size=150'; }} />
                <div className="absolute inset-0 bg-teal-500/10 mix-blend-overlay" />
              </div>

              <div className="text-center sm:text-left">
                <h2 className="text-2xl font-bold text-white mb-1">Saba Azadegan</h2>
                <div className="inline-block px-2 py-1 bg-teal-500/10 border border-teal-500/20 text-teal-400 text-[10px] mono uppercase tracking-widest rounded mb-2">
                  Lead Architect &amp; Protocol Engineer
                </div>
                <p className="text-xs text-gray-400 font-medium leading-snug">
                  MSc Student in Business<br/>Cat&oacute;lica Lisbon SBE
                </p>
              </div>
            </div>

            <p className="text-sm text-gray-300 leading-relaxed mb-6 border-l-2 border-teal-500/30 pl-4 py-1">
              Designed and built the DIVG protocol end to end: the Move smart contracts on SUI, the
              Hedera Consensus Service audit trail, the Compact SPP peer-prediction validation engine,
              anti-sybil identity, and Walrus storage &mdash; plus the full product UI/UX and front-end.
            </p>

            <div className="flex flex-wrap gap-2 mb-6">
              <Badge color="teal" icon={Code} text="Move Smart Contracts" />
              <Badge color="teal" icon={Fingerprint} text="Anti-Sybil Auth" />
              <Badge color="teal" icon={Network} text="Mechanism Design" />
              <Badge color="teal" icon={Palette} text="UI / UX & Frontend" />
            </div>

            <Contribution color="teal" items={[
              'SUI Move modules (divg.move, scoring.move)',
              'Hedera HCS audit logging',
              'Validation engine + ABM (server.js, abm_round.py)',
              'React/TypeScript app, design system & UX',
            ]} />

            <div className="flex items-center gap-3 pt-6 border-t border-white/5">
              <SocialLink href="https://github.com/sabaazdn73" icon={Github} />
              <SocialLink href="https://www.linkedin.com/in/saba-azadegan-2974b622a" icon={Linkedin} />
            </div>
          </motion.div>


          {/* ================= OMID'S CARD ================= */}
          <motion.div
            initial={{ opacity: 0, x: 30, y: 20 }}
            animate={{ opacity: 1, x: 0, y: 0 }}
            transition={{ delay: 0.3, duration: 0.6 }}
            onClick={() => setActive('omid')}
            className={`w-full lg:w-[480px] bg-[#080414]/90 border rounded-2xl p-8 relative overflow-hidden transition-all duration-300 cursor-pointer backdrop-blur-md lg:-ml-16 lg:mt-24 shadow-2xl
              ${active === 'omid'
                ? 'z-50 lg:scale-105 border-purple-500 shadow-[0_0_50px_rgba(168,85,247,0.2)]'
                : 'z-10 scale-100 border-white/5 hover:border-purple-500/30 hover:-translate-y-1 opacity-90'}`}
          >
            <div className="absolute top-0 left-0 w-32 h-32 bg-purple-500/10 rounded-full blur-3xl transition-opacity opacity-50" />

            <div className="flex flex-col sm:flex-row gap-6 items-center sm:items-start mb-6">
              <div className="w-28 h-28 rounded-2xl bg-[#05030A] border border-purple-500/30 shadow-[0_0_15px_rgba(168,85,247,0.15)] overflow-hidden flex-shrink-0 relative transition-transform duration-500">
                <img src="/omid.jpg" alt="Omid Azadegan" className="w-full h-full object-cover"
                     onError={(e) => { e.currentTarget.src = 'https://ui-avatars.com/api/?name=Omid+A&background=0D1117&color=A855F7&size=150'; }} />
                <div className="absolute inset-0 bg-purple-500/10 mix-blend-overlay" />
              </div>

              <div className="text-center sm:text-left lg:pl-4">
                <h2 className="text-2xl font-bold text-white mb-1">Omid Azadegan</h2>
                <div className="inline-block px-2 py-1 bg-purple-500/10 border border-purple-500/20 text-purple-400 text-[10px] mono uppercase tracking-widest rounded mb-2">
                  Impact Measurement Contributor
                </div>
                <p className="text-xs text-gray-400 font-medium leading-snug">
                  MSc Student in Business<br/>Cat&oacute;lica Lisbon SBE
                </p>
              </div>
            </div>

            <p className="text-sm text-gray-300 leading-relaxed mb-6 border-l-2 border-purple-500/30 pl-4 py-1">
              Built the optional Impact Evaluation layer: an ambition-adjusted, hierarchical-shrinkage
              benchmark that scores a firm's reported impact against IRIS+ metrics and sector peers &mdash;
              with an honest "shadow path" when no realized outcome is reported.
            </p>

            <div className="flex flex-wrap gap-2 mb-6">
              <Badge color="purple" icon={AreaChart} text="Impact Metrics (IRIS+)" />
              <Badge color="purple" icon={Database} text="Benchmark Modeling" />
              <Badge color="purple" icon={Network} text="ReFi Economics" />
            </div>

            <Contribution color="purple" items={[
              'Scoring engine (impact_scoring.js)',
              'Evaluation portal UI (LayerAnalytics.tsx)',
              'IRIS+ metric set (iris_metrics.ts)',
            ]} />

            <div className="flex items-center gap-3 pt-6 border-t border-white/5">
              <SocialLink href="https://github.com/omidfendi" icon={Github} />
              <SocialLink href="https://www.linkedin.com/in/azadeganomid" icon={Linkedin} />
            </div>
          </motion.div>

        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Helper UI Components
// ============================================================================

function Badge({ icon: Icon, text, color }: any) {
  const colorStyles = color === 'teal'
    ? 'bg-teal-500/5 border-teal-500/20 text-teal-300'
    : 'bg-purple-500/5 border-purple-500/20 text-purple-300';

  return (
    <span className={`flex items-center gap-1.5 px-2.5 py-1 rounded border text-[10px] mono ${colorStyles}`}>
      <Icon className="w-3 h-3 opacity-70" /> {text}
    </span>
  );
}

// Lists the concrete files / areas each person owns, so contributions are precise.
function Contribution({ items, color }: { items: string[]; color: 'teal' | 'purple' }) {
  const accent = color === 'teal' ? 'text-teal-400' : 'text-purple-400';
  return (
    <div className="mb-2 rounded-lg bg-white/5 border border-white/5 p-3">
      <div className={`text-[9px] mono uppercase tracking-[0.15em] mb-2 flex items-center gap-1.5 ${accent}`}>
        <FileCode2 className="w-3 h-3" /> Contribution
      </div>
      <ul className="space-y-1">
        {items.map((it, i) => (
          <li key={i} className="text-[11px] text-gray-400 leading-snug flex items-start gap-1.5">
            <span className={`mt-1.5 w-1 h-1 rounded-full flex-shrink-0 ${color === 'teal' ? 'bg-teal-400' : 'bg-purple-400'}`} />
            {it}
          </li>
        ))}
      </ul>
    </div>
  );
}

function SocialLink({ href, icon: Icon }: any) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer"
       className="p-2.5 bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/20 rounded-lg text-gray-400 hover:text-white transition-all shadow-sm">
      <Icon className="w-4 h-4" />
    </a>
  );
}