import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowRight, Users, FileText, GitBranch, Award, TrendingUp,
  Play, RotateCcw, Sparkles, LucideIcon
} from 'lucide-react';

type Step = {
  n: string;
  layer: string;
  to: string;
  color: string;
  icon: LucideIcon;
  title: string;
  say: string;
  does: string[];
  time: string;
};

const STEPS: Step[] = [
  {
    n: '00', layer: 'Overview', to: '/', color: 'firm', icon: Sparkles, time: '30 sec',
    title: 'Frame the problem',
    say: 'DIVG verifies subjective social-impact claims through a decentralised validator network, anchored on SUI and Hedera. Today an impact claim like "we cut food waste 47%" is audited separately by every investor — slow and expensive. DIVG does the verification once and shares it many times.',
    does: [
      'Point at the rotating 3D topology: firm → claim → validators → VIC → Hedera → investor',
      'Click "Seed Winnow / MSM example" to load the real case study',
    ],
  },
  {
    n: '01', layer: 'Identity', to: '/registry', color: 'firm', icon: Users, time: '45 sec',
    title: 'Stratified validator pool',
    say: 'Every participant has a self-sovereign DID anchored on SUI. Validators are stratified into three groups — employees in blue, experts in green, beneficiaries in amber. Sphere size is reputation. This is the pool the panel is drawn from.',
    does: [
      'Point at the 3D pool filling with validator spheres',
      'Optionally register your own validator to show it is a live sandbox, not a fixed demo',
    ],
  },
  {
    n: '02', layer: 'Claim', to: '/claim', color: 'claim', icon: FileText, time: '45 sec',
    title: 'Firm submits the impact claim',
    say: 'Winnow submits its impact claim — 47% waste reduction across 120 sites, 380 tonnes of food, 1,140 tonnes of CO2e, Q1 2025. It is hashed with SHA-256, anchored on SUI, and simultaneously logged to Hedera Consensus Service.',
    does: [
      'Confirm Winnow is selected, review the pre-filled claim',
      'Click "Submit claim on-chain" — point at the real SUI digest and Hedera sequence number',
    ],
  },
  {
    n: '03', layer: 'Validation', to: '/round', color: 'val', icon: GitBranch, time: '90 sec',
    title: 'The mechanism — commit, reveal, score',
    say: 'A stratified VRF draws the panel — 30% employees, 30% experts, 40% beneficiaries. Stage one: each validator commits a prior belief y_i, hashed on-chain. Stage two: they reveal a signal x_i. Then Compact SPP (Witkowski & Parkes, 2012) scores each against a random peer — truth-telling is the dominant strategy, so honesty is rational even without a ground truth.',
    does: [
      'Select the Winnow claim, set panel size 30, click "Run validation round"',
      'Narrate the animation: VRF draw → commit → reveal (green=vouch, amber=reject) → score',
      'Point at group densities, D_final, confidence, and the per-validator payment table',
    ],
  },
  {
    n: '04', layer: 'Credential', to: '/vic', color: 'vic', icon: Award, time: '45 sec',
    title: 'VIC minted unconditionally',
    say: 'The round produces a Verifiable Impact Credential. Crucially it is minted unconditionally — even a contested claim gets one. The platform is a transparency layer, not a gatekeeper. The consensus result is embedded as metadata, never used to block.',
    does: [
      'Point at the minted VIC and its embedded confidence / D_final',
      'Show the dual anchoring — SUI object on one side, Hedera HCS log on the other',
    ],
  },
  {
    n: '05', layer: 'Advisory', to: '/investor', color: 'invest', icon: TrendingUp, time: '45 sec',
    title: 'Investor advisory σ(C)',
    say: 'This is the investor view — the whole verification chain at a glance. They set their own risk threshold θ. At 0.85 the signal is σ=1, proceed. Raise θ above the claim confidence and it flips to caution. But it never blocks the claim — strictly advisory. Each investor decides for themselves.',
    does: [
      'Select the Winnow VIC, drag θ to 0.85, click "Compute σ(C)" — orb turns green',
      'Drag θ to 0.95, recompute — orb turns amber, showing it is advisory only',
    ],
  },
];

const COLORS: Record<string, string> = {
  firm: '#0F6E56', claim: '#0284C7', val: '#2563EB',
  vic: '#7C3AED', invest: '#4F46E5',
};

export default function LayerWalkthrough() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
      {/* header */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        <div className="text-[10px] mono tracking-widest text-muted mb-3 uppercase">
          Guided demo · Winnow / MSM example · ~5 minutes
        </div>
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight mb-4 leading-[1.05]">
          Demo walkthrough
        </h1>
        <p className="text-sm text-muted max-w-2xl leading-relaxed mb-6">
          A step-by-step tour of DIVG using a real case: Winnow, a Mustard Seed MAZE
          portfolio company, claiming a 47% food-waste reduction. Follow the steps in order —
          each links to the live layer. What you read aloud is in quotes; what you click is listed below it.
        </p>
        <div className="flex flex-wrap items-center gap-3 mb-2">
          <Link to="/" className="btn btn-primary flex items-center gap-2">
            Start at Overview <ArrowRight className="w-4 h-4" />
          </Link>
          <span className="text-[11px] mono text-muted flex items-center gap-2">
            <RotateCcw className="w-3 h-3" /> tip: click "Reset sandbox" on Overview first for a clean run
          </span>
        </div>
      </motion.div>

      {/* steps */}
      <div className="mt-10 space-y-4">
        {STEPS.map((s, i) => (
          <motion.div
            key={s.n}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: 0.05 * i }}
            className="card p-5 sm:p-6 relative"
          >
            {/* connector line */}
            {i < STEPS.length - 1 && (
              <div className="absolute left-[2.15rem] sm:left-[2.4rem] top-[4.5rem] bottom-[-1rem] w-px bg-border hidden sm:block" />
            )}
            <div className="flex gap-4">
              {/* icon + number */}
              <div className="flex-shrink-0">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center relative z-10"
                  style={{ backgroundColor: COLORS[s.color] }}>
                  <s.icon className="w-5 h-5 text-white" strokeWidth={2.2} />
                </div>
                <div className="text-[10px] mono text-muted text-center mt-1.5">{s.n}</div>
              </div>

              {/* content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between flex-wrap gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-base">{s.title}</h3>
                    <span className="pill bg-panel text-muted">{s.layer}</span>
                  </div>
                  <span className="text-[10px] mono text-muted">{s.time}</span>
                </div>

                {/* say */}
                <div className="border-l-2 pl-3 py-1 mb-3" style={{ borderColor: COLORS[s.color] }}>
                  <div className="text-[9px] mono uppercase tracking-wide text-muted mb-1">Say</div>
                  <p className="text-sm leading-relaxed italic text-ink/90">"{s.say}"</p>
                </div>

                {/* do */}
                <div className="mb-3">
                  <div className="text-[9px] mono uppercase tracking-wide text-muted mb-1.5">Do</div>
                  <ul className="space-y-1.5">
                    {s.does.map((d, j) => (
                      <li key={j} className="text-xs text-muted flex items-start gap-2 leading-relaxed">
                        <Play className="w-3 h-3 mt-0.5 flex-shrink-0" style={{ color: COLORS[s.color] }} />
                        {d}
                      </li>
                    ))}
                  </ul>
                </div>

                <Link to={s.to}
                  className="inline-flex items-center text-xs mono font-medium hover:gap-2 transition-all gap-1"
                  style={{ color: COLORS[s.color] }}>
                  Open {s.layer} layer <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* closing */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}
        className="card p-6 mt-6 bg-panel">
        <div className="text-[9px] mono uppercase tracking-wide text-muted mb-2">Closing line</div>
        <p className="text-sm leading-relaxed italic text-ink/90 mb-4">
          "One claim, verified once by a stratified panel under an incentive-compatible mechanism,
          anchored immutably on two chains, and independently checkable by any investor. That's DIVG —
          and everything you saw ran live on SUI and Hedera testnets."
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <Link to="/" className="btn btn-primary flex items-center gap-2">
            Begin the demo <ArrowRight className="w-4 h-4" />
          </Link>
          <span className="text-[11px] mono text-muted">
            Presenter tip: keep the backend terminal visible — the live SUI digests and Hedera
            sequence numbers prove it is real.
          </span>
        </div>
      </motion.div>
    </div>
  );
}
