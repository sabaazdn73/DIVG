import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { apiVote } from '../lib/api';
import { User, AlertTriangle } from 'lucide-react';
import PortalNavigation from '../components/PortalNavigation';

export default function LayerValidatorPanel() {
  const { roundId } = useParams(); 
  const [round, setRound] = useState<any>(null);
  const [did, setDid] = useState('');
  const [signal, setSignal] = useState(0.5);
  const [vote, setVote] = useState(1);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadingError, setLoadingError] = useState<string | null>(null);

  useEffect(() => {
    if (roundId) {
      const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:4000';
      fetch(`${baseUrl}/api/round/${roundId}`)
        .then(async (r) => {
          if (!r.ok) {
             const errData = await r.json().catch(() => ({}));
             throw new Error(errData.error || `Server error: ${r.status}`);
          }
          return r.json();
        })
        .then(data => {
          setRound(data);
          setLoadingError(null);
        })
        .catch(e => {
          console.error("Fetch round error:", e);
          setLoadingError('Failed to load round. It may have expired or the backend restarted.');
        });
    }
  }, [roundId]);

  // Handle Missing ID 
  if (!roundId) {
    return (
      <div className="max-w-xl mx-auto py-20 px-4 text-center mt-10 card p-8 bg-black/40 border border-white/10 text-gray-100">
        <h2 className="text-lg font-bold mb-2 uppercase tracking-wider text-white">No Active Round Selected</h2>
        <p className="text-gray-400 text-sm mb-6">
          To view the voting dashboard, you must first initiate a round.
        </p>
        <p className="text-xs mono text-purple-400 bg-[#05030A] border border-white/5 p-3 rounded">
          Workflow: Go to Validation Layer (03) → Initiate Round → System will redirect you here.
        </p>
      </div>
    );
  }

  // Handle Fetch Errors
  if (loadingError) {
    return (
      <div className="max-w-xl mx-auto py-20 px-4 text-center mt-10 card p-8 bg-black/40 border border-red-500/30 text-gray-100">
        <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
        <h2 className="text-lg font-bold text-white">Round Not Found</h2>
        <p className="text-red-400 text-sm mt-2">{loadingError}</p>
        <p className="text-xs mt-4 mono text-gray-400 bg-[#05030A] border border-white/5 p-2 rounded">
          Tip: If you restarted your backend, memory was cleared. Go back and initiate a new round.
        </p>
      </div>
    );
  }

  if (!round) return <div className="p-20 text-center mono text-sm text-gray-500 uppercase tracking-widest animate-pulse">Loading voting panel...</div>;
  
  const panel = round.panel || []; 
  const claimDescription = round.claim_description || `Active Claim ID: ${round.claim_id?.slice(0, 8)}...`;  
  
  async function handleSubmit() {
    if (!did) { setError('Please select your identity.'); return; }
    setError(null);
    const res = await apiVote({ round_id: roundId || '', did, signal, vote });
    if (res.error) setError(res.error);
    else setSubmitted(true);
  }

  return (
    <div className="max-w-5xl mx-auto py-10 px-4 text-gray-100">
      <div className="mb-8">
        <h1 className="text-2xl font-bold mb-2 text-white uppercase tracking-wider">Validation Dashboard</h1>
        <p className="text-gray-500 text-sm mono">Round ID: {roundId}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-4">
          <div className="card p-5 bg-black/40 border border-white/10">
            <h3 className="text-xs font-bold uppercase mb-4 tracking-wider text-gray-400">Selected Panel ({panel.length})</h3>
            <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
              {panel.map((v: any) => (
                <div key={v.did} className="flex items-center gap-3 p-2 rounded border border-white/5 bg-white/5 shadow-sm">
                  <div className="w-8 h-8 rounded bg-white/5 flex items-center justify-center flex-shrink-0">
                    <User className="w-4 h-4 text-purple-400" />
                  </div>
                  <div className="overflow-hidden">
                    <p className="text-xs font-semibold truncate text-white">{v.full_name}</p>
                    <p className="text-[10px] mono text-gray-500 truncate">{v.did}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="lg:col-span-2 space-y-6">
          <div className="card p-6 bg-black/40 border border-white/10">
            <h2 className="text-lg font-bold mb-1 text-white uppercase tracking-wider">Claim Verification</h2>
            <p className="text-sm text-gray-300 mb-6 bg-purple-500/5 p-3 rounded border border-purple-500/20 leading-relaxed">{claimDescription}</p>
            
            <div className="space-y-6">
              <div>
                <label className="block text-xs uppercase mb-2 font-semibold text-gray-400 tracking-wide">Select your Identity</label>
                <select className="w-full border border-white/10 rounded p-2 text-sm bg-[#05030A] text-white focus:ring-1 focus:ring-purple-500 outline-none" onChange={(e) => setDid(e.target.value)}>
                  <option value="">-- Choose your DID from the panel --</option>
                  {panel.map((v: any) => <option key={v.did} value={v.did}>{v.full_name}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-xs uppercase mb-2 font-semibold text-gray-400 tracking-wide">Peer Prediction (Signal: {signal})</label>
                <input type="range" min="0" max="1" step="0.1" defaultValue={0.5} 
                       className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer accent-purple-500" 
                       onChange={(e) => setSignal(parseFloat(e.target.value))} />
              </div>
              
              <div>
                <label className="block text-xs uppercase mb-2 font-semibold text-gray-400 tracking-wide">Vote</label>
                <select className="w-full border border-white/10 rounded p-2 text-sm bg-[#05030A] text-white focus:ring-1 focus:ring-purple-500 outline-none" onChange={(e) => setVote(parseInt(e.target.value))}>
                  <option value="1">Approve</option>
                  <option value="0">Reject</option>
                </select>
              </div>

              {error && <p className="text-xs text-red-400 font-mono bg-red-500/10 border border-red-500/20 p-2 rounded">{error}</p>}

              <button onClick={handleSubmit} disabled={submitted}
                className="w-full bg-purple-500 text-white py-3 rounded font-bold transition-all hover:bg-purple-400 disabled:bg-white/5 disabled:text-gray-500 disabled:cursor-not-allowed">
                {submitted ? 'Vote Cast Successfully ✓' : 'Submit Verification Signal'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* SMART NAVIGATION IMPLEMENTED PERFECTLY HERE */}
      <PortalNavigation />

    </div>
  );
}