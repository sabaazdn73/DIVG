import { Routes, Route, NavLink, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Network, FileText, Users, Award, TrendingUp,
  GitBranch, ArrowRight
} from 'lucide-react';

import LayerOverview from './layers/LayerOverview';
import LayerRegistry from './layers/LayerRegistry';
import LayerClaim    from './layers/LayerClaim';
import LayerRound    from './layers/LayerRound';
import LayerVIC      from './layers/LayerVIC';
import LayerInvestor from './layers/LayerInvestor';
import LayerWalkthrough from './layers/LayerWalkthrough';

const LAYERS = [
  { path: '/registry', label: 'Identity Layer',     desc: 'DID Registry + WaaP onboarding',         color: 'firm',   icon: Users    },
  { path: '/claim',    label: 'Claim Layer',        desc: 'W3C Verifiable Credentials on SUI',      color: 'claim',  icon: FileText },
  { path: '/round',    label: 'Validation Layer',   desc: 'Compact SPP + commit-reveal',            color: 'val',    icon: GitBranch },
  { path: '/vic',      label: 'Credential Layer',   desc: 'VIC minted unconditionally + Hedera HCS',color: 'vic',    icon: Award    },
  { path: '/investor', label: 'Advisory Layer',     desc: 'σ(C) signal · investor query',           color: 'invest', icon: TrendingUp },
];

export default function App() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        <Routes>
          <Route path="/"          element={<LayerOverview layers={LAYERS} />} />
          <Route path="/registry"  element={<LayerRegistry />} />
          <Route path="/claim"     element={<LayerClaim />} />
          <Route path="/round"     element={<LayerRound />} />
          <Route path="/vic"       element={<LayerVIC />} />
          <Route path="/investor"  element={<LayerInvestor />} />
          <Route path="/walkthrough" element={<LayerWalkthrough />} />
        </Routes>
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
          <div className="w-9 h-9 rounded-lg bg-ink flex items-center justify-center">
            <Network className="w-5 h-5 text-white" strokeWidth={2.4} />
          </div>
          <div>
            <h1 className="text-base font-semibold tracking-tight leading-none">DIVG</h1>
            <p className="text-[10px] mono text-muted mt-1 tracking-wide">DIGITAL IDENTITY + VERIFICATION GRAPH</p>
          </div>
        </button>
        <nav className="flex flex-wrap items-center gap-1 justify-end">
          {LAYERS.map((l, i) => (
            <NavLink
              key={l.path}
              to={l.path}
              className={({ isActive }) =>
                `px-3 py-2 text-xs mono tracking-wide rounded-md transition-all ${
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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-[10px] mono text-muted tracking-wide">
        <span>DIVG · MSc Thesis Católica Lisbon · 2025/26</span>
        <span className="flex items-center gap-4">
          <span className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-vic" /> SUI testnet
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-hedera" /> Hedera HCS
          </span>
        </span>
      </div>
    </footer>
  );
}
