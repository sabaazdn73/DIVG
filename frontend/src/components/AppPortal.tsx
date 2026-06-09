import { useState } from 'react';
import { motion } from 'framer-motion';
import { Send, FileText, CheckCircle2, Link2, ExternalLink } from 'lucide-react';
import { apiSubmitClaim, apiInitiateRound } from '../lib/api';

export default function AppPortal() {
  const [status, setStatus] = useState<'idle' | 'submitting' | 'live'>('idle');
  const [claimId, setClaimId] = useState('');

  // Minimal form for the firm
  async function handleClaim(e: React.FormEvent) {
    e.preventDefault();
    setStatus('submitting');
    // Simplified submission for the portal view
    const res = await apiSubmitClaim({ firm_did: 'did:divg:winnow', description: 'Impact Report Q2 2026', claim_data: {} });
    setClaimId(res.claim.claim_id);
    setStatus('live');
  }

  return (
    <div className="max-w-7xl mx-auto p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
      
      {/* COLUMN 1: REGISTRY (Simplified) */}
      <div className="card p-6 bg-white/5 border border-white/10">
        <h2 className="text-sm font-bold text-gray-400 uppercase mb-4">1. Organization</h2>
        <div className="p-4 bg-teal-500/10 border border-teal-500/20 rounded-lg">
          <p className="text-white font-semibold">Winnow Solutions</p>
          <p className="text-xs text-gray-400 font-mono">DID: did:divg:winnow...</p>
        </div>
      </div>

      {/* COLUMN 2: WORKFLOW (Simplified) */}
      <div className="card p-6 bg-white/5 border border-white/10">
        <h2 className="text-sm font-bold text-gray-400 uppercase mb-4">2. Impact Claim</h2>
        {status === 'idle' ? (
          <form onSubmit={handleClaim} className="space-y-4">
            <textarea className="w-full h-32 bg-black/40 border border-white/10 rounded p-3 text-sm text-gray-200" placeholder="Describe your impact..." />
            <button className="w-full py-3 bg-teal-500 text-black font-bold rounded hover:bg-teal-400 transition-all">Submit Claim</button>
          </form>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-teal-400"><CheckCircle2 size={20}/> Anchored on SUI</div>
            <button onClick={() => apiInitiateRound({ claim_id: claimId })} className="w-full py-3 bg-purple-600 text-white font-bold rounded hover:bg-purple-500">
              Initiate Verification
            </button>
          </div>
        )}
      </div>

      {/* COLUMN 3: GLOBE/STATS (The Explanation View) */}
      <div className="card p-6 bg-white/5 border border-white/10 flex flex-col items-center justify-center">
        <h2 className="text-sm font-bold text-gray-400 uppercase mb-4 w-full">3. Live Network</h2>
        <div className="w-full h-48 bg-black/40 rounded-lg flex items-center justify-center text-gray-600 font-mono text-xs">
          [ 3D Visualization of Participants ]
        </div>
      </div>

    </div>
  );
}