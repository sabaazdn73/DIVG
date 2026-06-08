import { Link } from 'react-router-dom';
import { Building2, UserCheck, ArrowRight, ShieldCheck } from 'lucide-react';
import { motion } from 'framer-motion';

export default function AppPortal() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4 font-['Inter',sans-serif]">
      <div className="max-w-4xl w-full">
        <div className="text-center mb-12">
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
            <ShieldCheck className="w-16 h-16 text-ink mx-auto mb-4" />
            <h1 className="text-4xl font-bold tracking-tight text-ink mb-3">
              DIVG Impact Portal
            </h1>
            <p className="text-muted max-w-lg mx-auto">
              The decentralized verification network for institutional impact claims.
              Select your organization type to proceed.
            </p>
          </motion.div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          
          {/* Firm View */}
          <motion.div 
            initial={{ opacity: 0, x: -20 }} 
            animate={{ opacity: 1, x: 0 }} 
            transition={{ delay: 0.1 }}
            className="card p-8 bg-white border-2 border-transparent hover:border-ink shadow-lg transition-all"
          >
            <Building2 className="w-12 h-12 text-ink mb-6" />
            <h2 className="text-2xl font-bold mb-2">Impact Firm</h2>
            <p className="text-muted text-sm mb-8 leading-relaxed">
              Submit your operational impact data for independent verification. Track active validation rounds and export your Verifiable Impact Credentials (VIC).
            </p>
            {/* Navigates directly to the Claim submission, bypassing the overview */}
            <Link to="/claim?portal=firm" className="btn bg-ink text-white w-full flex items-center justify-center py-3 rounded-md font-semibold hover:bg-ink/90 transition-all">
              Firm Login <ArrowRight className="w-4 h-4 ml-2" />
            </Link>
          </motion.div>

          {/* Validator View */}
          <motion.div 
            initial={{ opacity: 0, x: 20 }} 
            animate={{ opacity: 1, x: 0 }} 
            transition={{ delay: 0.2 }}
            className="card p-8 bg-white border-2 border-transparent hover:border-vic shadow-lg transition-all"
          >
            <UserCheck className="w-12 h-12 text-vic mb-6" />
            <h2 className="text-2xl font-bold mb-2">Network Validator</h2>
            <p className="text-muted text-sm mb-8 leading-relaxed">
              Register your W3C DID, complete your public-record Anti-Sybil check, and participate in Live Voting rounds to earn rewards for honest peer-prediction.
            </p>
            {/* Navigates directly to the Identity Registry, bypassing the overview */}
            <Link to="/registry?portal=validator" className="btn bg-vic text-white w-full flex items-center justify-center py-3 rounded-md font-semibold hover:bg-vic/90 transition-all">
              Validator Login <ArrowRight className="w-4 h-4 ml-2" />
            </Link>
          </motion.div>

        </div>
        
        <div className="text-center mt-12 text-xs text-muted mono">
          <p>Testnet Beta &middot; SUI &middot; Walrus &middot; WaaP</p>
          <Link to="/" className="text-ink underline hover:text-vic mt-2 inline-block">
            Access Developer Sandbox / Overview
          </Link>
        </div>
      </div>
    </div>
  );
}