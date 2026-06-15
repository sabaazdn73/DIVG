import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Building2, UserCheck, ArrowRight, ShieldCheck, Fingerprint, Hexagon, Waypoints, Landmark, Activity, Database, Brain } from 'lucide-react';
import { motion } from 'framer-motion';

export default function AppPortal() {
  // App states to handle progressive multi-step flows
  const [firmStep, setFirmStep] = useState(1);
  const [valStep, setValStep] = useState(1);

  return (
    <div className="min-h-screen bg-[#141026] flex flex-col items-center justify-center p-6 font-['Inter',sans-serif] text-gray-100 relative overflow-hidden">
      
      {/* Background Glows */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-teal-500/10 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-500/10 blur-[120px] rounded-full pointer-events-none" />

      <div className="max-w-6xl w-full relative z-10">
        <div className="text-center mb-12">
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
            <ShieldCheck className="w-16 h-16 text-teal-400 mx-auto mb-4 drop-shadow-[0_0_15px_rgba(45,212,191,0.3)]" />
            <h1 className="text-4xl font-bold tracking-tight text-white mb-3 font-['Pixelify_Sans',monospace]">
              DIVG B2B Portal
            </h1>
            <p className="text-gray-400 max-w-lg mx-auto text-sm">
              The decentralized verification network for institutional impact claims. Complete the mandatory configuration checklist sequentially to launch.
            </p>
          </motion.div>
        </div>

        <div className="flex flex-col gap-8">
          
          {/* ================= FIRM PROGRESSIVE WORKFLOW ================= */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
            className="bg-white/[0.04] border border-white/10 rounded-2xl p-5 sm:p-8 shadow-[0_0_30px_rgba(0,0,0,0.5)] backdrop-blur-md"
          >
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 border-b border-white/5 pb-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-teal-500/10 rounded-lg border border-teal-500/20">
                  <Building2 className="w-8 h-8 text-teal-400" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-white tracking-wide">Impact Firm Setup Sequence</h2>
                  <p className="text-gray-500 text-xs mt-1 mono uppercase tracking-widest">Progressive Onboarding &middot; Step {firmStep} of 3</p>
                </div>
              </div>
              
              {/* Dynamic progressive action button */}
              {firmStep === 1 && (
                <Link to="/registry?portal=firm" onClick={() => setFirmStep(2)} className="btn bg-teal-500 text-black hover:bg-teal-400 flex items-center gap-2 py-2 px-6 rounded font-bold transition-all shadow-[0_0_15px_rgba(45,212,191,0.2)]">
                  Step 1: Register Firm Details <ArrowRight className="w-4 h-4" />
                </Link>
              )}
              {firmStep === 2 && (
                <Link to="/claim?portal=firm" onClick={() => setFirmStep(3)} className="btn bg-teal-500 text-black hover:bg-teal-400 flex items-center gap-2 py-2 px-6 rounded font-bold transition-all shadow-[0_0_15px_rgba(45,212,191,0.2)]">
                  Step 2: Submit Impact Claim <ArrowRight className="w-4 h-4" />
                </Link>
              )}
              {firmStep === 3 && (
                <Link to="/vic" className="btn bg-teal-600 text-white hover:bg-teal-500 flex items-center gap-2 py-2 px-6 rounded font-bold transition-all shadow-[0_0_15px_rgba(13,148,136,0.3)]">
                  Step 3: Export Minted VIC <ArrowRight className="w-4 h-4" />
                </Link>
              )}
            </div>

            {/* Step Window Track */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <WorkflowStepWindow 
                step="01" icon={Fingerprint} color="teal" title="Identity Layer" 
                desc="Register corporate W3C DID and satisfy Anti-Sybil Gate conditions." 
                path="/registry" active={firmStep === 1} done={firmStep > 1} onClick={() => setFirmStep(1)}
              />
              <WorkflowStepWindow 
                step="02" icon={Hexagon} color="teal" title="Claim Layer" 
                desc="Compile and hash localized operational impact data directly onto SUI." 
                path="/claim" active={firmStep === 2} done={firmStep > 2} onClick={() => setFirmStep(2)}
              />
              <WorkflowStepWindow 
                step="03" icon={ShieldCheck} color="teal" title="Credential Layer" 
                desc="Unconditionally access cryptographic results archived via Walrus blobs." 
                path="/vic" active={firmStep === 3} done={firmStep > 3} onClick={() => setFirmStep(3)}
              />
            </div>
          </motion.div>

          {/* ================= VALIDATOR PROGRESSIVE WORKFLOW ================= */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
            className="bg-white/[0.04] border border-white/10 rounded-2xl p-5 sm:p-8 shadow-[0_0_30px_rgba(0,0,0,0.5)] backdrop-blur-md"
          >
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 border-b border-white/5 pb-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-orange-500/10 rounded-lg border border-orange-500/20">
                  <UserCheck className="w-8 h-8 text-orange-400" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-white tracking-wide">Network Validator Sequence</h2>
                  <p className="text-gray-500 text-xs mt-1 mono uppercase tracking-widest">Progressive Onboarding &middot; Step {valStep} of 3</p>
                </div>
              </div>

              {/* Dynamic progressive action button */}
              {valStep === 1 && (
                <Link to="/registry?portal=validator" onClick={() => setValStep(2)} className="btn bg-orange-500 text-black hover:bg-orange-400 flex items-center gap-2 py-2 px-6 rounded font-bold transition-all shadow-[0_0_15px_rgba(249,115,22,0.2)]">
                  Step 1: Register Node Identity <ArrowRight className="w-4 h-4" />
                </Link>
              )}
              {valStep === 2 && (
                <Link to="/round" onClick={() => setValStep(3)} className="btn bg-blue-500 text-white hover:bg-blue-400 flex items-center gap-2 py-2 px-6 rounded font-bold transition-all shadow-[0_0_15px_rgba(59,130,246,0.2)]">
                  Step 2: Inspect Network Topology <ArrowRight className="w-4 h-4" />
                </Link>
              )}
              {valStep === 3 && (
                <Link to="/voting" className="btn bg-orange-500 text-black hover:bg-orange-400 flex items-center gap-2 py-2 px-6 rounded font-bold transition-all shadow-[0_0_15px_rgba(249,115,22,0.2)]">
                  Step 3: Execute Peer Prediction Vote <ArrowRight className="w-4 h-4" />
                </Link>
              )}
            </div>

            {/* Validator Window Track */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <WorkflowStepWindow 
                step="01" icon={Fingerprint} color="orange" title="Identity Layer" 
                desc="Stake nodes, configure public cryptographic footprints, enter pool." 
                path="/registry" active={valStep === 1} done={valStep > 1} onClick={() => setValStep(1)}
              />
              <WorkflowStepWindow 
                step="03" icon={Waypoints} color="blue" title="Validation Layer" 
                desc="Review current Compact Shadow Private-Prior panel matrices." 
                path="/round" active={valStep === 2} done={valStep > 2} onClick={() => setValStep(2)}
              />
              <WorkflowStepWindow 
                step="04" icon={Landmark} color="orange" title="Voting Panel" 
                desc="Submit secure truth signals using structural cross-prediction." 
                path="/voting" active={valStep === 3} done={valStep > 3} onClick={() => setValStep(3)}
              />
            </div>
          </motion.div>

          {/* ================= NEW: PREMIUM ANALYTICS WORKFLOW (STANDALONE) ================= */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
            className="bg-purple-900/10 border border-purple-500/20 rounded-2xl p-5 sm:p-8 shadow-[0_0_30px_rgba(0,0,0,0.5)] backdrop-blur-md relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 border-b border-purple-500/20 pb-6 relative z-10">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-purple-500/20 rounded-lg border border-purple-500/30">
                  <Activity className="w-8 h-8 text-purple-400" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-white tracking-wide">Impact Performance Auditing</h2>
                  <p className="text-purple-300/70 text-xs mt-1 mono uppercase tracking-widest">Third-Party Independent Verification</p>
                </div>
              </div>

              <Link to="/analytics" className="btn bg-purple-600 text-white hover:bg-purple-500 flex items-center gap-2 py-2 px-6 rounded font-bold transition-all shadow-[0_0_15px_rgba(147,51,234,0.4)]">
                Launch Evaluation Portal <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 relative z-10">
              <div className="p-5 rounded-xl border border-purple-500/20 bg-white/[0.04] flex flex-col justify-center">
                <Database className="w-5 h-5 text-purple-400 mb-2" />
                <h3 className="font-bold text-sm mb-1 text-white">Dynamic Sector Benchmarking</h3>
                <p className="text-xs text-gray-400 leading-relaxed">
                  Score a firm's impact pace of change against real GIIN sector benchmarks and the SDG-aligned threshold.
                </p>
              </div>
              <div className="p-5 rounded-xl border border-purple-500/20 bg-white/[0.04] flex flex-col justify-center">
                <Brain className="w-5 h-5 text-purple-400 mb-2" />
                <h3 className="font-bold text-sm mb-1 text-white">AI Agent Integrations</h3>
                <p className="text-xs text-gray-400 leading-relaxed">
                  Anchor impact scorecards securely to Walrus to allow the DIVG AI Agent to audit claims and answer investor queries.
                </p>
              </div>
            </div>
          </motion.div>

        </div>
        
        <div className="text-center mt-12 text-xs text-gray-500 mono flex flex-col items-center gap-2">
          <p>Testnet Beta &middot; SUI &middot; Walrus &middot; WaaP</p>
          <Link to="/" className="text-gray-400 hover:text-white underline underline-offset-4 transition-colors flex items-center gap-1">
            <ArrowRight className="w-3 h-3" /> Access Developer Sandbox / Overview
          </Link>
        </div>
      </div>
    </div>
  );
}

// Interactive progressive application window component
function WorkflowStepWindow({ step, icon: Icon, color, title, desc, path, active, done, onClick }: any) {
  const colorMap: Record<string, string> = {
    teal: 'border-teal-500/20 text-teal-400',
    orange: 'border-orange-500/20 text-orange-400',
    blue: 'border-blue-500/20 text-blue-400',
    purple: 'border-purple-500/20 text-purple-400',
  };

  return (
    <div 
      onClick={onClick}
      className={`p-5 rounded-xl border backdrop-blur-sm transition-all flex flex-col h-full cursor-pointer relative overflow-hidden group ${
        active 
          ? 'bg-white/10 border-white/30 shadow-[0_0_20px_rgba(255,255,255,0.05)] ring-1 ring-white/20' 
          : done 
            ? 'bg-white/[0.06] opacity-60 border-emerald-500/20 hover:opacity-90' 
            : 'bg-white/[0.025] opacity-40 hover:opacity-70'
      }`}
    >
      <div className="flex items-center justify-between mb-4">
        <Icon className={`w-6 h-6 ${active ? colorMap[color] : 'text-gray-400'} drop-shadow-[0_0_8px_currentColor]`} />
        <div className="flex items-center gap-2">
          {done && <span className="text-[9px] font-bold tracking-wider text-emerald-400 bg-emerald-400/10 px-1.5 py-0.5 rounded uppercase font-mono">Passed</span>}
          {active && <span className="text-[9px] font-bold tracking-wider text-teal-400 bg-teal-400/10 px-1.5 py-0.5 rounded uppercase font-mono">Active</span>}
          <span className="text-[10px] font-mono tracking-widest text-gray-500">LAYER {step}</span>
        </div>
      </div>
      <h3 className="font-bold text-sm mb-2 text-white flex items-center gap-2">
        {title}
      </h3>
      <p className="text-xs text-gray-400 leading-relaxed mt-auto">{desc}</p>
    </div>
  );
}