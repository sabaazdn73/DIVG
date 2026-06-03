import { Routes, Route, NavLink, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Network, FileText, Users, Award, TrendingUp,
  GitBranch, ArrowRight, UsersRound, FileCheck, Vote, Zap
} from 'lucide-react';

import LayerOverview from './layers/LayerOverview';
import LayerRegistry from './layers/LayerRegistry';
import LayerClaim    from './layers/LayerClaim';
import LayerRound    from './layers/LayerRound';
import LayerVIC      from './layers/LayerVIC';
import LayerInvestor from './layers/LayerInvestor';
import LayerWalkthrough from './layers/LayerWalkthrough';
import SignatureGlobe from './components/SignatureGlobe';

const LAYERS = [
  { path: '/registry', label: 'Identity Layer',   desc: 'DID Registry + WaaP onboarding',          color: 'firm',   icon: UsersRound },
  { path: '/claim',    label: 'Claim Layer',      desc: 'W3C Verifiable Credentials on SUI',       color: 'claim',  icon: FileCheck  },
  { path: '/round',    label: 'Validation Layer', desc: 'Compact SPP + commit-reveal',             color: 'val',    icon: Vote       },
  { path: '/vic',      label: 'Credential Layer', desc: 'VIC minted unconditionally + Hedera HCS', color: 'vic',    icon: Award      },
  { path: '/investor', label: 'Advisory Layer',   desc: 'sigma(C) signal · investor query',        color: 'invest', icon: Zap        },
];

export default function App() {
  return (
    <div className="min-h-screen flex flex-col font-['Inter',sans-serif] tracking-tight">
      <Header />
      <main className="flex-1 relative">
        <div className="absolute inset-0 overflow-hidden pointer-events-none" style={{ zIndex: 0 }}>
          <SignatureGlobe opacity={0.7} rightOffset="55%" />
        </div>
        <div className="relative" style={{ zIndex: 1 }}>
          <Routes>
            <Route path="/"            element={<LayerOverview layers={LAYERS} />} />
            <Route path="/registry"    element={<LayerRegistry />} />
            <Route path="/claim"       element={<LayerClaim />} />
            <Route path="/round"       element={<LayerRound />} />
            <Route path="/vic"         element={<LayerVIC />} />
            <Route path="/investor"    element={<LayerInvestor />} />
            <Route path="/walkthrough" element={<LayerWalkthrough />} />
          </Routes>
        </div>
      </main>
      <Footer />
    </div>
  );
}

function Header() {
  const navigate = useNavigate();
  return (
    <header className="border-b border-border bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between gap-2">
        <button onClick={() => navigate('/')} className="flex items-center gap-3 text-left">
          <img src="/divg-logo.png" alt="divg-logo.png" className="w-9 h-9 rounded-lg object-cover" />
          <div>
            {/* INJECTED PIXEL FONT HERE */}
            <h1 className="text-xl font-semibold tracking-wide leading-none font-['Pixelify_Sans',monospace]">DIVG</h1>
            <p className="text-[10px] text-muted mt-1 tracking-wide font-medium">Decentralized Impact Verification Graph</p>
          </div>
        </button>

        <nav className="flex flex-wrap items-center gap-1 justify-end">
          {LAYERS.map((l, i) => (
            <NavLink
              key={l.path}
              to={l.path}
              className={({ isActive }) =>
                /* Changed 'mono' to clean sans-serif for Pixel UI feel */
                `px-3 py-2 text-xs font-semibold tracking-wide rounded-md transition-all ${
                  isActive ? 'bg-ink text-white' : 'text-muted hover:text-ink hover:bg-panel'
                }`
              }
            >
              0{i + 1}
            </NavLink>
          ))}
        </nav>
      </div>
    </header>
  );
}

function Footer() {
  return (
    <footer className="border-t border-border bg-white py-4">
      <div className="max-w-7xl mx-auto px-6 flex items-center justify-between text-[14px] text-muted tracking-wide">
        <span>
          Crafted by{' '}
          <a
            href="https://www.linkedin.com/in/saba-azadegan-2974b622a"
            target="_blank"
            rel="noopener noreferrer"
            className="text-ink font-semibold hover:text-invest underline underline-offset-2 transition-colors"
          >
            Saba Azadegan
          </a>
          {' · '}Built for{' '}
          <a
            href="https://sui.io/overflow"
            target="_blank"
            rel="noopener noreferrer"
            className="text-ink font-semibold hover:text-vic underline underline-offset-2 transition-colors"
          >
            Sui Overflow 2026
          </a>
          {' · '}Based on MSc Thesis &mdash; Impact Washing Solution
        </span>
        <span className="flex items-center gap-4">
          <a
            href="/walkthrough"
            className="text-ink font-semibold hover:text-invest underline underline-offset-2 transition-colors"
          >
            Demo walkthrough
          </a>
          {/* INJECTED PIXEL FONT HERE */}
          <span className="flex items-center gap-1.5 font-['Pixelify_Sans',monospace] tracking-wider text-xs">
            <span className="w-1.5 h-1.5 rounded-full bg-vic" /> SUI testnet
          </span>
          
        </span>
      </div>
    </footer>
  );
}