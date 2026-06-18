import { Routes, Route, NavLink, useNavigate, Link } from 'react-router-dom';
import { useState } from 'react';
import { motion } from 'framer-motion';
import ZoomControl from './components/ZoomControl';
import ThemeToggle from './components/ThemeToggle';
// FIXED: Updated imports to match your new Web3 LAYERS, and removed Twitter to use the custom X SVG
// ADDED: 'Activity' icon for the new Analytics layer
import {
  Fingerprint, Hexagon, Waypoints, Landmark, ShieldCheck, Radar, ArrowRight, Github, Mail, ExternalLink, Users, Activity
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
import LayerTeam from './layers/LayerTeam';
import AssistantWidget from './components/AssistantWidget';
import LayerAnalytics from './layers/LayerAnalytics';
import LayerLanding from './layers/LayerLanding';

const LAYERS = [
  { path: '/registry', label: 'Identity Layer',   desc: 'WaaP + SerpAPI Anti-Sybil Gate',          color: 'firm',   icon: Fingerprint },
  { path: '/claim',    label: 'Claim Layer',      desc: 'W3C Verifiable Credentials on SUI',       color: 'claim',  icon: Hexagon     },
  { path: '/round',    label: 'Validation Layer', desc: 'Compact SPP + ABM Simulation',            color: 'val',    icon: Waypoints   },
  { path: '/voting',   label: 'Voting Panel',     desc: 'Live DAO Validator Dashboard',            color: 'vote',   icon: Landmark    },
  { path: '/vic',      label: 'Credential Layer', desc: 'VIC minted unconditionally + Walrus',     color: 'vic',    icon: ShieldCheck },
  { path: '/investor', label: 'Advisory Layer',   desc: 'Dynamic risk σ(C) + investor query',      color: 'invest', icon: Radar       },
  // ADDED: The new Impact Analytics layer so it shows up in your Navigation and Overview grid!
  { path: '/analytics', label: 'Impact Analytics', desc: 'Score impact pace vs real GIIN sector benchmarks & SDG thresholds', color: 'invest', icon: Activity },
];

export default function App() {
  return (
    <Routes>
      {/* Optional welcome page — the app itself stays at "/" */}
      <Route path="/welcome" element={<LayerLanding />} />
      <Route path="/*" element={<AppShell />} />
    </Routes>
  );
}

function AppShell() {
  const [zoom, setZoom] = useState(1);
  return (
    <>
    {/* Background globe lives OUTSIDE the zoomed container — a fixed element
        inside a CSS-zoom div gets clipped/mis-scaled on mobile. It sits behind
        everything (zIndex 0); the app surfaces float above it. */}
    <div className="fixed inset-0 overflow-hidden pointer-events-none bg-[#141026]" style={{ zIndex: 0 }}>
      <SignatureGlobe opacity={0.47} rightOffset="55%" />
    </div>
    <div className="min-h-screen flex flex-col text-gray-100 font-['Inter',sans-serif] tracking-tight antialiased relative"
      style={{ zoom, zIndex: 1 }}>
      <Header />
      <main className="flex-1 relative">
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
            <Route path="/team"        element={<LayerTeam />} />
            
            <Route path="/portal" element={<AppPortal />} />
            <Route path="/analytics" element={<LayerAnalytics />} />
          </Routes>
        </div>
      </main>
      <Footer />
      <AssistantWidget />
      </div>
      <ZoomControl onZoom={setZoom} />
    </>
  );
}

function Header() {
  const navigate = useNavigate();
  return (
    <header className="border-b border-white/5 bg-[#141026]/80 backdrop-blur-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between gap-2">
        <button onClick={() => navigate('/')} className="flex items-center gap-2 sm:gap-3 text-left group shrink-0">
          <img src="/divg-logo.png" alt="DIVG" className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg object-cover ring-1 ring-white/10 group-hover:ring-teal-400 transition-all" />
          <div>
            <h1 className="text-lg sm:text-xl font-semibold tracking-wide leading-none font-['Pixelify_Sans',monospace] text-white">DIVG</h1>
            <p className="hidden sm:block text-[10px] text-gray-400 mt-1 tracking-wide font-medium uppercase">Decentralized Impact Verification Graph</p>
          </div>
        </button>

        <nav className="flex flex-wrap items-center gap-1 justify-end">
          {LAYERS.map((l, i) => (
            <NavLink
              key={l.path}
              to={l.path}
              className={({ isActive }) =>
                `px-2.5 sm:px-3 py-1.5 sm:py-2 text-xs font-semibold tracking-wide rounded-md transition-all ${
                  isActive 
                    ? 'bg-white/10 text-white shadow-[0_0_15px_rgba(255,255,255,0.05)] border border-white/10' 
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`
              }
            >
              0{i + 1}
            </NavLink>
          ))}
          <ThemeToggle />
        </nav>
      </div>
    </header>
  );
}

// ADD Users to your lucide-react imports at the top of App.tsx
function Footer() {
  return (
    <footer className="border-t border-white/5 bg-[#0F0B1F] py-6">
      <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center md:items-start justify-between text-[14px] text-gray-400 tracking-wide gap-6">
        
        {/* Left Side: Credits & Socials */}
        <div className="flex flex-col gap-3 text-center md:text-left">
          <span>
            <a href="https://sui.io/overflow" target="_blank" rel="noopener noreferrer" className="text-white font-semibold hover:text-purple-400 underline underline-offset-2 transition-colors">
              Sui Overflow 2026
            </a>
            {' · '}Based on MSc Thesis &mdash; Impact Washing Solution
          </span>
          
          {/* Social icons */}
          <div className="flex items-center justify-center md:justify-start gap-4 mt-1 text-gray-500 flex-wrap">
            
            <a href="https://medium.com/@sabaazadegan/solving-the-impact-washing-crisis-with-web3-introducing-the-digital-identity-verification-23d1844b9e00" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors" title="Medium">
              <svg viewBox="0 0 1043.63 592.71" className="w-[18px] h-[18px] fill-current"><path d="M588.67 296.36c0 163.67-131.78 296.35-294.33 296.35S0 460 0 296.36 131.78 0 294.34 0s294.33 132.69 294.33 296.36M911.56 296.36c0 154.06-65.89 279-147.17 279s-147.17-124.94-147.17-279 65.88-279 147.16-279 147.17 124.9 147.17 279M1043.63 296.36c0 138-23.17 249.94-51.76 249.94s-51.75-111.91-51.75-249.94 23.17-249.94 51.75-249.94 51.76 111.9 51.76 249.94"/></svg>
            </a>
            
            
            <a href="https://github.com/sabaazdn73/DIVG" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors" title="GitHub">
              <Github className="w-[18px] h-[18px]" />
            </a>
            <a href="https://x.com/SabaAzadegan" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors" title="X (Twitter)">
              <svg viewBox="0 0 24 24" className="w-[18px] h-[18px] fill-current" xmlns="http://www.w3.org/2000/svg">
                <path d="M18.901 1.153h3.68l-8.04 9.19L24 22.846h-7.406l-5.8-7.584-6.638 7.584H.474l8.6-9.83L0 1.154h7.594l5.243 6.932ZM17.61 20.644h2.039L6.486 3.24H4.298Z"/>
              </svg>
            </a>
            <a href="https://medium.com/@sabaazadegan/solving-the-impact-washing-crisis-with-web3-introducing-the-digital-identity-verification-23d1844b9e00" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors" title="Medium">
              <svg viewBox="0 0 1043.63 592.71" className="w-[18px] h-[18px] fill-current"><path d="M588.67 296.36c0 163.67-131.78 296.35-294.33 296.35S0 460 0 296.36 131.78 0 294.34 0s294.33 132.69 294.33 296.36M911.56 296.36c0 154.06-65.89 279-147.17 279s-147.17-124.94-147.17-279 65.88-279 147.16-279 147.17 124.9 147.17 279M1043.63 296.36c0 138-23.17 249.94-51.76 249.94s-51.75-111.91-51.75-249.94 23.17-249.94 51.75-249.94 51.76 111.9 51.76 249.94"/></svg>
            </a>
            <a href="mailto:sabaazad93@gmail.com" className="hover:text-red-400 transition-colors" title="Email">
              <Mail className="w-[18px] h-[18px]" />
            </a>
          </div>

          {/* Nav links — wrap cleanly on mobile */}
          <div className="flex items-center justify-center md:justify-start gap-x-3 gap-y-1.5 mt-2 text-gray-500 flex-wrap">
            <Link to="/welcome" className="text-xs font-semibold hover:text-red-400 transition-colors">Landing Page</Link>
            <span className="text-white/10">|</span>
            <a href="/catalog.html" target="_blank" rel="noopener noreferrer" className="text-xs font-semibold hover:text-red-400 transition-colors">Catalog</a>
            <span className="text-white/10">|</span>
            <Link to="/walkthrough" className="text-xs font-semibold hover:text-teal-400 transition-colors">Demo Walkthrough</Link>
            <span className="text-white/10">|</span>
            <Link to="/team" className="text-xs font-semibold hover:text-blue-400 transition-colors flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5" /> Meet the Team
            </Link>
            <span className="text-white/10">|</span>
            <a href="https://trustcycle.tech" target="_blank" rel="noopener noreferrer" className="text-xs font-semibold hover:text-purple-400 transition-colors flex items-center gap-1.5">
              <ExternalLink className="w-3.5 h-3.5" /> Previous Work
            </a>
          </div>
        </div>

        {/* Right Side: Network Status Badges */}
        <span className="flex flex-row md:flex-col flex-wrap items-center md:items-end justify-center gap-1.5 mt-2 md:mt-0">
          {/* SUI testnet */}
          <span className="flex items-center gap-1.5 font-['Pixelify_Sans',monospace] tracking-wider text-xs text-purple-400 bg-purple-500/10 px-2.5 py-1 rounded-md border border-purple-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-pulse" /> SUI testnet
          </span>
          {/* Walrus testnet */}
          <span className="flex items-center gap-1.5 font-['Pixelify_Sans',monospace] tracking-wider text-xs text-teal-400 bg-teal-500/10 px-2.5 py-1 rounded-md border border-teal-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-pulse" /> Walrus testnet
          </span>
        </span>
      </div>
    </footer>
  );
}