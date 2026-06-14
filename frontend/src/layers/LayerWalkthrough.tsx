import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowRight, RotateCcw, Sparkles, Play, LucideIcon,
  Fingerprint, Hexagon, Waypoints, Landmark, ShieldCheck, Radar
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
    title: 'Frame the dynamic risk problem',
    say: 'Traditional impact reporting assesses "static risk" via PDFs that every investor must audit separately. DIVG introduces a dynamic, verifiable graph anchored on SUI and Hedera. It verifies a subjective claim once through a decentralised network, and shares it many times.',
    does: [
      'Point at the rotating 3D topology: firm → claim → validators → VIC → Hedera → investor',
      'Click "Seed Winnow / MSM example" to load the real portfolio case study',
    ],
  },
  {
    n: '01', layer: 'Identity', to: '/registry', color: 'firm', icon: Fingerprint, time: '45 sec',
    title: 'Anti-Sybil Gate & Stratified Pool',
    say: 'Validators aren’t just anonymous wallets. Before receiving a W3C DID on SUI, they must pass a live Anti-Sybil gate. We use SerpAPI for public-record web verification, followed by a live email OTP dispatched via Resend. Only verified experts and employees enter the stratified 3D pool.',
    does: [
      'Point at the 3D pool filling with validator spheres (size = reputation)',
      'Optionally register a new validator to show the live OTP generation working in real-time',
    ],
  },
  {
    n: '02', layer: 'Claim', to: '/claim', color: 'claim', icon: Hexagon, time: '45 sec',
    title: 'Firm submits the impact claim (+ evidence on Walrus)',
    say: 'Winnow submits its impact claim — 47% waste reduction across 120 sites, 380 tonnes of food, 1,140 tonnes of CO2e. Any supporting evidence file is uploaded to Walrus decentralised storage, and the claim is hashed with SHA-256 and anchored on the SUI settlement layer. Optionally, the firm adds a sector and an annualized pace of change — and the system automatically computes an impact score against real GIIN benchmarks, attached to the claim as guidance. Every step is optionally mirrored to the Hedera Consensus Service.',
    does: [
      'Confirm Winnow is selected, review the pre-filled claim',
      'Attach an evidence file — point at the returned "Evidence on Walrus" blob id',
      'Note the optional sector + pace fields — the system auto-computes the impact score',
      'Click "Sign & Anchor Claim" — point at the real SUI digest (Hedera is optional)',
    ],
  },
  {
    n: '03', layer: 'Validation', to: '/round', color: 'val', icon: Waypoints, time: '60 sec',
    title: 'Dual-Workflow Verification (Compact SPP)',
    say: 'A stratified VRF draws the panel. We have two execution paths: an instant Python ABM Simulation, or the live DAO workflow. In both, Compact SPP scores validators against a random peer—making truth-telling the strictly rational strategy, even without a ground truth.',
    does: [
      'Set panel size to 30. Mention the instant "Run Simulation" button.',
      'Click the "Initiate Live Round" button to trigger the real DAO workflow and redirect to the Voting Panel.',
    ],
  },
  {
    n: '04', layer: 'Voting Panel', to: '/voting', color: 'vote', icon: Landmark, time: '45 sec',
    title: 'The Live DAO Dashboard',
    say: 'This is the live Validator Dashboard. Because we just initiated a round, the sortition panel is locked in. Before voting, each validator sees everything they need to judge the claim: the declaration, the evidence file on Walrus, and the optional system impact score — clearly flagged as automated guidance. A selected validator reviews the panel, predicts the peer signal, and casts their vote. Once the panel has voted, anyone can finalize the round — Compact SPP scores the real votes and mints the VIC.',
    does: [
      'Point at the claim, the Walrus evidence link, and the optional system score',
      'Show the transparency panel on the left (showing DID hashes)',
      'Select a DID, adjust the signal slider, and cast a vote',
      'Click "Finalize Round → Mint VIC" to score the real votes and mint the credential',
    ],
  },
  {
    n: '05', layer: 'Credential', to: '/vic', color: 'vic', icon: ShieldCheck, time: '45 sec',
    title: 'VIC minted unconditionally to Walrus',
    say: 'The round produces a Verified Impact Claim (VIC). It is minted unconditionally — even a contested claim gets one. Beyond the VIC, the entire round audit trail (the panel, every vote, the scoring result) is stored on Walrus, so an investor can independently re-audit the whole process — not just the final result. The VIC links to both the evidence blob and the audit blob.',
    does: [
      'Point at the minted VIC and its embedded confidence / D_final',
      'Click "View Walrus Blob" to show the data persists entirely off-platform',
      'Note the linked evidence and audit-trail blob ids',
    ],
  },
  {
    n: '06', layer: 'Impact Evaluation', to: '/analytics', color: 'invest', icon: Radar, time: '60 sec',
    title: 'Optional: impact scoring vs real GIIN benchmarks',
    say: 'This optional layer scores a firm\u2019s annualized impact pace of change against its sector\u2019s real GIIN peer median and the SDG-aligned threshold. For sectors like energy and financial inclusion the benchmark uses published GIIN figures; others are clearly flagged as illustrative. If a real outcome exists it shows a realized score; if not, an honest shadow path with ambition only. The scorecard is anchored to Walrus, and the AI agent answers questions by reading it directly from Walrus.',
    does: [
      'Pick a sector, enter the target and actual pace, run the benchmark',
      'Read the ambition, adjusted score and SDG gap \u2014 note the benchmark source label',
      'Click "Attach to Walrus", then ask the AI agent a question \u2014 note it reads from Walrus',
    ],
  },
  {
    n: '07', layer: 'Advisory', to: '/investor', color: 'invest', icon: Radar, time: '45 sec',
    title: 'Investor advisory σ(C)',
    say: 'This is the investor view — the whole verification chain at a glance. They set their own dynamic risk threshold θ. At 0.85 the signal is σ=1, proceed. Raise θ above the claim confidence and it flips to caution. It never blocks the claim — each investor decides for themselves.',
    does: [
      'Select the Winnow VIC, drag θ to 0.85, click "Compute σ(C)" — orb turns green',
      'Drag θ to 0.95, recompute — orb turns amber, demonstrating the non-custodial nature of the platform.',
    ],
  },
];

const COLORS: Record<string, string> = {
  firm: '#0F6E56', claim: '#0284C7', val: '#2563EB',
  vote: '#EA580C', vic: '#7C3AED', invest: '#4F46E5',
};

export default function LayerWalkthrough() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
      {/* header */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        <div className="text-[10px] mono tracking-widest text-muted mb-3 uppercase">
          Guided demo · Winnow / MSM example · ~7 minutes
        </div>
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight mb-4 leading-[1.05] text-white">
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
              <div className="absolute left-[2.15rem] sm:left-[2.4rem] top-[4.5rem] bottom-[-1rem] w-px bg-white/5 hidden sm:block" />
            )}
            <div className="flex gap-4">
              {/* icon + number */}
              <div className="flex-shrink-0">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center relative z-10 animate-fade"
                  style={{ backgroundColor: COLORS[s.color] }}>
                  <s.icon className="w-5 h-5 text-white drop-shadow-[0_0_6px_rgba(255,255,255,0.4)]" strokeWidth={2.2} />
                </div>
                <div className="text-[10px] mono text-muted text-center mt-1.5">{s.n}</div>
              </div>

              {/* content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between flex-wrap gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-base text-white">{s.title}</h3>
                    <span className="pill bg-white/5 border border-white/5 text-gray-400">{s.layer}</span>
                  </div>
                  <span className="text-[10px] mono text-gray-500">{s.time}</span>
                </div>

                {/* say */}
                <div className="border-l-2 pl-3 py-1 mb-3" style={{ borderColor: COLORS[s.color] }}>
                  <div className="text-[9px] mono uppercase tracking-wide text-gray-500 mb-1">Say</div>
                  <p className="text-sm leading-relaxed italic text-gray-300">"{s.say}"</p>
                </div>

                {/* do */}
                <div className="mb-3">
                  <div className="text-[9px] mono uppercase tracking-wide text-gray-500 mb-1.5">Do</div>
                  <ul className="space-y-1.5">
                    {s.does.map((d, j) => (
                      <li key={j} className="text-xs text-gray-400 flex items-start gap-2 leading-relaxed">
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
        className="card p-6 mt-6 bg-white/[0.04] border border-white/10">
        <div className="text-[9px] mono uppercase tracking-wide text-gray-500 mb-2">Closing line</div>
        <p className="text-sm leading-relaxed italic text-gray-300 mb-4">
          "One claim, verified once by a stratified panel under an incentive-compatible mechanism,
          anchored immutably on Sui, Hedera, and Walrus, and independently checkable by any investor. That's DIVG."
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <Link to="/" className="btn btn-primary flex items-center gap-2">
            Begin the demo <ArrowRight className="w-4 h-4" />
          </Link>
          <span className="text-[11px] mono text-gray-500">
            Presenter tip: keep the backend terminal visible — the live OTP dispatches, SUI digests, and Hedera
            sequence numbers prove it is real.
          </span>
        </div>
      </motion.div>
    </div>
  );
}