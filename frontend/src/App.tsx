import { Routes, Route, NavLink, useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  UserCheck, FileText, GitBranch, Vote, Award, TrendingUp, ArrowRight,
  Linkedin, Github, Twitter, Mail, ExternalLink
} from 'lucide-react';

import LayerVICShare from './layers/LayerVICShare';
import LayerVICShareWalrus from './layers/LayerVICShareWalrus';
import LayerOverview from './layers/LayerOverview';
import LayerRegistry from './layers/LayerRegistry';
import LayerClaim    from './layers/LayerClaim';
import LayerRound    from './layers/LayerRound';
import LayerVIC      from './layers/LayerVIC';
import LayerInvestor from './layers/LayerInvestor';
import LayerWalkthrough from './layers/LayerWalkthrough';

import LayerValidatorPanel from './layers/LayerValidatorPanel'; 
import SignatureGlobe from './components/SignatureGlobe';
import AppPortal from './components/AppPortal';

const LAYERS = [
  { path: '/registry', label: 'Identity Layer',   desc: 'WaaP + SerpAPI Anti-Sybil Gate',          color: 'firm',   icon: UserCheck },
  { path: '/claim',    label: 'Claim Layer',      desc: 'W3C Verifiable Credentials on SUI',       color: 'claim',  icon: FileText  },
  { path: '/round',    label: 'Validation Layer', desc: 'Compact SPP + ABM Simulation',            color: 'val',    icon: GitBranch },
  { path: '/voting',   label: 'Voting Panel',     desc: 'Live DAO Validator Dashboard',            color: 'vote',   icon: Vote      },
  { path: '/vic',      label: 'Credential Layer', desc: 'VIC minted unconditionally + Walrus',     color: 'vic',    icon: Award     },
  { path: '/investor', label: 'Advisory Layer',   desc: 'Dynamic risk σ(C) + investor query',      color: 'invest', icon: TrendingUp},
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
            
            <Route path="/voting"      element={<LayerValidatorPanel />} />
            <Route path="/voting/:roundId" element={<LayerValidatorPanel />} />
            
            <Route path="/vic"         element={<LayerVIC />} />
            <Route path="/vic/walrus/:blobId" element={<LayerVICShareWalrus />} />
            <Route path="/vic/:id"            element={<LayerVICShare />} />
            <Route path="/investor"    element={<LayerInvestor />} />
            <Route path="/walkthrough" element={<LayerWalkthrough />} />
            
            <Route path="/portal" element={<AppPortal />} />
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
    <footer className="border-t border-border bg-white py-6">
      <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center md:items-start justify-between text-[14px] text-muted tracking-wide gap-6">
        
        {/* Left Side: Credits & Socials */}
        <div className="flex flex-col gap-3 text-center md:text-left">
          <span>
            Crafted by <span className="text-ink font-semibold">Saba & Omid Azadegan</span> for{' '}
            <a href="https://sui.io/overflow" target="_blank" rel="noopener noreferrer" className="text-ink font-semibold hover:text-vic underline underline-offset-2 transition-colors">
              Sui Overflow 2026
            </a>
            {' · '}Based on MSc Thesis &mdash; Impact Washing Solution
          </span>
          
          <div className="flex items-center justify-center md:justify-start gap-4 mt-1 text-muted">
            <a href="https://www.linkedin.com/in/saba-azadegan-2974b622a" target="_blank" rel="noopener noreferrer" className="hover:text-[#0A66C2] transition-colors" title="LinkedIn">
              <Linkedin className="w-[18px] h-[18px]" />
            </a>
            <a href="https://github.com/sabaazdn73?tab=repositories" target="_blank" rel="noopener noreferrer" className="hover:text-ink transition-colors" title="GitHub">
              <Github className="w-[18px] h-[18px]" />
            </a>
            <a href="https://x.com/SabaAzadegan" target="_blank" rel="noopener noreferrer" className="hover:text-ink transition-colors" title="X (Twitter)">
              <Twitter className="w-[18px] h-[18px]" />
            </a>
            <a href="https://medium.com/@sabaazadegan" target="_blank" rel="noopener noreferrer" className="hover:text-ink transition-colors" title="Medium">
              <svg viewBox="0 0 1043.63 592.71" className="w-[18px] h-[18px] fill-current"><path d="M588.67 296.36c0 163.67-131.78 296.35-294.33 296.35S0 460 0 296.36 131.78 0 294.34 0s294.33 132.69 294.33 296.36M911.56 296.36c0 154.06-65.89 279-147.17 279s-147.17-124.94-147.17-279 65.88-279 147.16-279 147.17 124.9 147.17 279M1043.63 296.36c0 138-23.17 249.94-51.76 249.94s-51.75-111.91-51.75-249.94 23.17-249.94 51.75-249.94 51.76 111.9 51.76 249.94"/></svg>
            </a>
            <a href="mailto:sabaazad93@gmail.com" className="hover:text-red-500 transition-colors" title="Email">
              <Mail className="w-[18px] h-[18px]" />
            </a>
            <span className="text-border px-1">|</span>
            <a href="https://trustcycle.tech" target="_blank" rel="noopener noreferrer" className="text-xs font-semibold hover:text-vic transition-colors flex items-center gap-1.5">
              <ExternalLink className="w-3.5 h-3.5" /> Previous Work
            </a>
          </div>
        </div>

        {/* Right Side: Demo & Status */}
        <span className="flex items-center gap-4 mt-2 md:mt-0">
          <Link to="/walkthrough" className="text-ink font-semibold hover:text-invest underline underline-offset-2 transition-colors">
            Demo walkthrough
          </Link>
          <span className="flex items-center gap-1.5 font-['Pixelify_Sans',monospace] tracking-wider text-xs">
            <span className="w-1.5 h-1.5 rounded-full bg-vic" /> SUI testnet
          </span>
        </span>
      </div>
    </footer>
  );
}