import { Link } from 'react-router-dom';
import { Building2, UserCheck, ArrowRight, ShieldCheck, Fingerprint, Hexagon, Waypoints, Landmark } from 'lucide-react';
import { motion } from 'framer-motion';

export default function AppPortal() {
  return (
    <div className="min-h-screen bg-[#0C0518] flex flex-col items-center justify-center p-6 font-['Inter',sans-serif] text-gray-100 relative overflow-hidden">
      
      {/* Background Glows */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-teal-500/10 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-500/10 blur-[120px] rounded-full pointer-events-none" />

      <div className="max-w-6xl w-full relative z-10">
        <div className="text-center mb-16">
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
            <ShieldCheck className="w-16 h-16 text-teal-400 mx-auto mb-4 drop-shadow-[0_0_15px_rgba(45,212,191,0.3)]" />
            <h1 className="text-4xl font-bold tracking-tight text-white mb-3 font-['Pixelify_Sans',monospace]">
              DIVG B2B Portal
            </h1>
            <p className="text-gray-400 max-w-lg mx-auto text-sm">
              The decentralized verification network for institutional impact claims.
              Select your organization workflow to proceed.
            </p>
          </motion.div>
        </div>

        <div className="flex flex-col gap-10">
          
          {/* ================= FIRM WORKFLOW ================= */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
            className="bg-black/40 border border-white/10 rounded-2xl p-8 shadow-[0_0_30px_rgba(0,0,0,0.5)] backdrop-blur-md relative group hover:border-teal-500/30 transition-colors"
          >
            <div className="flex items-center gap-4 mb-8 border-b border-white/5 pb-6">
              <div className="p-3 bg-teal-500/10 rounded-lg border border-teal-500/20">
                <Building2 className="w-8 h-8 text-teal-400" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white tracking-wide">Impact Firm Portal</h2>
                <p className="text-gray-500 text-xs mt-1 mono uppercase tracking-widest">Submit & Export</p>
              </div>
              <Link to="/claim" className="ml-auto btn bg-teal-500 text-black hover:bg-teal-400 flex items-center gap-2 py-2 px-6 rounded font-bold transition-all shadow-[0_0_15px_rgba(45,212,191,0.2)]">
                Enter Firm Hub <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

            {/* Firm Windows (Left to Right) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <WorkflowWindow 
                step="01" icon={Fingerprint} color="teal" title="Identity Layer" 
                desc="Register W3C DID and pass WaaP Anti-Sybil gate." path="/registry"
              />
              <WorkflowWindow 
                step="02" icon={Hexagon} color="teal" title="Claim Layer" 
                desc="Hash operational data and anchor to SUI Testnet." path="/claim"
              />
              <WorkflowWindow 
                step="05" icon={ShieldCheck} color="purple" title="Credential Layer" 
                desc="View and export your verified VIC from Walrus." path="/vic"
              />
            </div>
          </motion.div>

          {/* ================= VALIDATOR WORKFLOW ================= */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
            className="bg-black/40 border border-white/10 rounded-2xl p-8 shadow-[0_0_30px_rgba(0,0,0,0.5)] backdrop-blur-md relative group hover:border-orange-500/30 transition-colors"
          >
            <div className="flex items-center gap-4 mb-8 border-b border-white/5 pb-6">
              <div className="p-3 bg-orange-500/10 rounded-lg border border-orange-500/20">
                <UserCheck className="w-8 h-8 text-orange-400" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white tracking-wide">Validator Portal</h2>
                <p className="text-gray-500 text-xs mt-1 mono uppercase tracking-widest">Verify & Earn</p>
              </div>
              <Link to="/voting" className="ml-auto btn bg-orange-500 text-black hover:bg-orange-400 flex items-center gap-2 py-2 px-6 rounded font-bold transition-all shadow-[0_0_15px_rgba(249,115,22,0.2)]">
                Enter Validator Hub <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

            {/* Validator Windows (Left to Right) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <WorkflowWindow 
                step="01" icon={Fingerprint} color="orange" title="Identity Layer" 
                desc="Stake reputation and enter the validator pool." path="/registry"
              />
              <WorkflowWindow 
                step="03" icon={Waypoints} color="blue" title="Validation Layer" 
                desc="Review Compact SPP network topology." path="/round"
              />
              <WorkflowWindow 
                step="04" icon={Landmark} color="orange" title="Voting Panel" 
                desc="Cast truth signals via live DAO dashboard." path="/voting"
              />
            </div>
          </motion.div>

        </div>
        
        <div className="text-center mt-12 text-xs text-gray-500 mono flex flex-col items-center gap-2">
          <p>Testnet Beta &middot; SUI &middot; Hedera &middot; Walrus</p>
          <Link to="/" className="text-gray-400 hover:text-white underline underline-offset-4 transition-colors flex items-center gap-1">
            <ArrowRight className="w-3 h-3" /> Return to Academic Sandbox (All Layers)
          </Link>
        </div>
      </div>
    </div>
  );
}

// Reusable component for the "Windows"
function WorkflowWindow({ step, icon: Icon, color, title, desc, path }: any) {
  // Determine color variables based on prop
  const colorMap: Record<string, string> = {
    teal: 'text-teal-400 bg-teal-500/5 border-teal-500/20 hover:border-teal-500/50',
    orange: 'text-orange-400 bg-orange-500/5 border-orange-500/20 hover:border-orange-500/50',
    blue: 'text-blue-400 bg-blue-500/5 border-blue-500/20 hover:border-blue-500/50',
    purple: 'text-purple-400 bg-purple-500/5 border-purple-500/20 hover:border-purple-500/50',
  };
  
  const styles = colorMap[color] || colorMap.teal;

  return (
    <Link to={path} className={`p-5 rounded-xl border transition-all flex flex-col h-full group ${styles}`}>
      <div className="flex items-center justify-between mb-4">
        <Icon className="w-6 h-6 drop-shadow-[0_0_8px_currentColor]" />
        <span className="text-[10px] mono tracking-widest opacity-50 font-bold group-hover:opacity-100 transition-opacity">LAYER {step}</span>
      </div>
      <h3 className="font-bold text-white text-sm mb-2">{title}</h3>
      <p className="text-xs text-gray-400 leading-relaxed mt-auto opacity-80 group-hover:opacity-100 transition-opacity">{desc}</p>
    </Link>
  );
}