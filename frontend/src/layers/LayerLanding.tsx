import { useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { ArrowRight, ShieldCheck, Boxes, Network, FileCheck2, Eye, Sparkles } from 'lucide-react';

// Welcome page at /welcome — an optional intro. The app itself lives at "/".
// Signature: a claim transforms from "unverified / hazy" into a "sealed,
// verified credential" — the one thing DIVG actually does.
export default function LayerLanding() {
  const navigate = useNavigate();
  const [sealed, setSealed] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setSealed(true), 700);
    const loop = setInterval(() => setSealed(s => !s), 3800);
    return () => { clearTimeout(t); clearInterval(loop); };
  }, []);

  const enterApp = () => navigate('/');

  return (
    <div className="min-h-screen bg-[#141026] text-gray-100 font-['Inter',sans-serif] overflow-x-hidden relative">
      {/* Fade-in animation for the hero banner */}
      <style>{`
        @keyframes divg-fade-up { from { opacity: 0; transform: translateY(16px) scale(0.98); } to { opacity: 1; transform: translateY(0) scale(1); } }
        .divg-fade-up { animation: divg-fade-up 1s cubic-bezier(0.22, 1, 0.36, 1) both; }
        @media (prefers-reduced-motion: reduce) { .divg-fade-up { animation: none; } }
      `}</style>

      <div className="pointer-events-none absolute top-[-15%] left-[-10%] w-[55%] h-[55%] bg-teal-500/10 blur-[140px] rounded-full" />
      <div className="pointer-events-none absolute bottom-[-15%] right-[-10%] w-[55%] h-[55%] bg-purple-500/10 blur-[140px] rounded-full" />

      {/* Top bar */}
      <nav className="relative z-10 flex items-center justify-between max-w-6xl mx-auto px-6 py-5">
        <div className="flex items-center gap-2.5">
          <img src="/divg-logo.png" alt="DIVG" className="w-9 h-9 rounded-lg object-cover" />
          <span className="font-bold tracking-tight font-['Pixelify_Sans',monospace] text-lg">DIVG</span>
        </div>
        <div className="flex items-center gap-5 text-sm">
          <button onClick={() => navigate('/walkthrough')} className="hidden sm:block text-gray-400 hover:text-white transition-colors">Demo</button>
          <button onClick={() => navigate('/team')} className="hidden sm:block text-gray-400 hover:text-white transition-colors">Team</button>
          <button onClick={enterApp}
            className="bg-white/5 hover:bg-white/10 border border-white/10 rounded-md px-4 py-1.5 transition-colors">
            Enter app
          </button>
        </div>
      </nav>

      {/* Hero — the banner is the headline, fading in on load */}
      <header className="relative z-10 max-w-6xl mx-auto px-6 pt-6 pb-16">
        <div className="divg-fade-up rounded-2xl overflow-hidden border border-white/10 shadow-2xl">
          <img src="/og-banner-2400x1260.png"
            alt="DIVG — Decentralised Impact Verification Graph · built on Sui & Walrus"
            className="w-full block" />
        </div>

        {/* Headline spans the full width so it stays on one line and can grow large */}
        <div className="mt-12 mb-10">
          <div className="inline-flex items-center gap-2 text-[11px] mono tracking-[0.18em] uppercase text-teal-400 border border-teal-500/20 bg-teal-500/5 rounded-full px-3 py-1 mb-5">
            <Sparkles className="w-3 h-3" /> Infrastructure for ReFi
          </div>
          <h1 className="font-bold leading-[1.1] tracking-tight whitespace-nowrap"
            style={{ fontSize: 'clamp(1.25rem, 5vw, 3.5rem)' }}>
            Prove Impact <span className="text-teal-400">Once,</span> Trust It <span className="text-purple-400">Everywhere.</span>
          </h1>
        </div>

        <div className="grid lg:grid-cols-2 gap-10 items-center">
          <div>
            <p className="text-gray-400 text-base leading-relaxed max-w-xl mb-7">
              DIVG verifies an impact-investing claim a single time through a decentralised
              validator network, then issues a reusable, on-chain credential — so no investor
              ever has to re-audit it, and no firm can quietly overstate its impact.
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <button onClick={enterApp}
                className="group inline-flex items-center gap-2 bg-teal-500 hover:bg-teal-400 text-black font-bold rounded-lg px-6 py-3 transition-all shadow-[0_0_30px_rgba(45,212,191,0.3)]">
                Enter the app <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
              </button>
              <button onClick={() => navigate('/walkthrough')}
                className="inline-flex items-center gap-2 border border-white/15 hover:bg-white/5 rounded-lg px-6 py-3 transition-colors">
                Watch the walkthrough
              </button>
            </div>
          </div>

          {/* Signature: claim → verified credential */}
          <div className="relative h-[300px] flex items-center justify-center">
            <div className="relative w-full max-w-[300px]">
              <div className={`absolute inset-0 rounded-2xl border p-6 transition-all duration-1000
                ${sealed ? 'opacity-0 -translate-y-3 scale-95 blur-sm' : 'opacity-100 border-white/15 bg-white/[0.03]'}`}>
                <div className="text-[10px] mono uppercase tracking-widest text-gray-500 mb-3">Unverified claim</div>
                <div className="space-y-2">
                  <div className="h-2.5 w-3/4 bg-white/10 rounded" />
                  <div className="h-2.5 w-1/2 bg-white/10 rounded" />
                  <div className="h-2.5 w-2/3 bg-white/10 rounded" />
                </div>
                <div className="mt-5 text-xs text-gray-500 italic">"47% waste reduction across 120 sites…"</div>
              </div>
              <div className={`absolute inset-0 rounded-2xl border p-6 transition-all duration-1000
                ${sealed ? 'opacity-100 border-teal-500/40 bg-gradient-to-br from-teal-500/10 to-purple-500/10 shadow-[0_0_40px_rgba(45,212,191,0.15)]' : 'opacity-0 translate-y-3 scale-95'}`}>
                <div className="flex items-center justify-between mb-3">
                  <div className="text-[10px] mono uppercase tracking-widest text-teal-300">Verified Impact Claim</div>
                  <FileCheck2 className="w-4 h-4 text-teal-400" />
                </div>
                <div className="space-y-2.5 text-xs">
                  <Row label="Confidence" value="0.62" />
                  <Row label="Validators" value="4 / 6" />
                  <Row label="Anchored on" value="SUI · Walrus" />
                </div>
                <div className="mt-4 flex items-center gap-1.5 text-[10px] mono text-teal-400/80">
                  <ShieldCheck className="w-3 h-3" /> sealed on-chain
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* How it works */}
      <section className="relative z-10 max-w-6xl mx-auto px-6 py-16 border-t border-white/10">
        <h2 className="text-xs mono uppercase tracking-[0.2em] text-gray-500 mb-10">How a claim becomes proof</h2>
        <div className="grid md:grid-cols-3 gap-6">
          <Step n="01" icon={Network} title="Verify once"
            body="A firm submits a claim. A stratified panel of validators is drawn and scored by a peer-prediction mechanism that makes honest reporting the rational choice." />
          <Step n="02" icon={Boxes} title="Anchor on-chain"
            body="The credential is minted on SUI. Evidence, the full round audit trail, and the scorecard are stored on Walrus — verifiable even if our servers go dark." />
          <Step n="03" icon={Eye} title="Reuse forever"
            body="Any investor opens the credential and re-audits the whole process independently. Verified once, trusted by many — no repeated audits." />
        </div>
      </section>

      {/* Why decentralisation — the structural thesis */}
      <section className="relative z-10 max-w-6xl mx-auto px-6 py-16 border-t border-white/10">
        <h2 className="text-xs mono uppercase tracking-[0.2em] text-teal-400 mb-6">Why decentralisation</h2>
        <p className="text-gray-300 text-lg md:text-xl leading-relaxed max-w-4xl">
          Impact verification today is gatekept by centralised intermediaries — auditors and rating
          agencies — that can be captured, can extract rent, and become single points of failure and
          trust. DIVG treats verification as a public good: it <span className="text-teal-400">redistributes
          the authority to verify</span> away from any single gatekeeper toward a transparent network of
          stakeholders, where honest reporting is the rational strategy and the evidence, the votes, and
          the result are independently auditable on-chain.
        </p>
        <p className="text-gray-500 text-sm leading-relaxed max-w-4xl mt-4">
          The contribution is structural — decentralisation as a redistribution of trust-making power.
          Not a claim that any one actor is more honest, but that no single actor has to be trusted.
        </p>
      </section>

      {/* See it in action — real product screenshot */}
      <section className="relative z-10 max-w-6xl mx-auto px-6 py-16 border-t border-white/10">
        <div className="flex items-end justify-between mb-8 flex-wrap gap-4">
          <div>
            <h2 className="text-xs mono uppercase tracking-[0.2em] text-gray-500 mb-2">See it in action</h2>
            <p className="text-gray-300 text-lg max-w-xl">A live, on-chain workspace — registry, claim anchoring, and the Compact SPP audit trail, running on testnet.</p>
          </div>
          <button onClick={enterApp}
            className="inline-flex items-center gap-2 text-teal-400 hover:text-teal-300 text-sm font-semibold transition-colors">
            Open the live app <ArrowRight className="w-4 h-4" />
          </button>
        </div>
        <button onClick={enterApp} className="block w-full group" aria-label="Open the live app">
          <div className="rounded-2xl border border-white/10 overflow-hidden shadow-2xl group-hover:border-teal-500/40 transition-all">
            <img src="/app-preview.png" alt="DIVG live app — on-chain registry, claim verification, and audit trail"
              className="w-full block group-hover:scale-[1.01] transition-transform duration-700" />
          </div>
        </button>
      </section>

      {/* Audience strip */}
      <section className="relative z-10 max-w-6xl mx-auto px-6 pb-20">
        <div className="grid sm:grid-cols-3 gap-4">
          <Audience title="For funds" body="Onboard a portfolio company and receive a reusable impact credential instead of a bespoke audit." />
          <Audience title="For firms" body="Submit a claim, share it with your community, and prove your impact without revealing private data." />
          <Audience title="For everyone" body="Open any credential and check the chain yourself. The proof doesn't depend on trusting us." />
        </div>
      </section>

      {/* Footer CTA */}
      <footer className="relative z-10 border-t border-white/10">
        <div className="max-w-6xl mx-auto px-6 py-12 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div>
            <div className="font-bold text-lg mb-1">See it run end to end.</div>
            <div className="text-sm text-gray-500">A guided walkthrough with a real example — Winnow × Mustard Seed MAZE.</div>
          </div>
          <button onClick={enterApp}
            className="inline-flex items-center gap-2 bg-teal-500 hover:bg-teal-400 text-black font-bold rounded-lg px-6 py-3 transition-all">
            Enter the app <ArrowRight className="w-4 h-4" />
          </button>
        </div>
        <div className="max-w-6xl mx-auto px-6 pb-8 text-[11px] text-gray-600 flex flex-wrap gap-x-4 gap-y-1">
          <span>DIVG · Decentralised Impact Verification Graph</span>
          <span>·</span>
          <span>Built for SUI Overflow 2026</span>
          <span>·</span>
          <span>MSc thesis · Católica Lisbon</span>
        </div>
      </footer>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-gray-400">{label}</span>
      <span className="mono text-white">{value}</span>
    </div>
  );
}

function Step({ n, icon: Icon, title, body }: any) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6 hover:border-teal-500/30 transition-colors">
      <div className="flex items-center justify-between mb-4">
        <span className="mono text-2xl text-white/20 font-bold">{n}</span>
        <Icon className="w-5 h-5 text-teal-400" />
      </div>
      <h3 className="font-bold text-lg mb-2">{title}</h3>
      <p className="text-sm text-gray-400 leading-relaxed">{body}</p>
    </div>
  );
}

function Audience({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-xl border border-white/10 p-5">
      <div className="text-teal-400 font-bold text-sm mb-1.5">{title}</div>
      <p className="text-xs text-gray-400 leading-relaxed">{body}</p>
    </div>
  );
}
