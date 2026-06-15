import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { apiVote, apiGetRound, apiFinalizeRound, evidenceUrl } from '../lib/api';
import { User, AlertTriangle, FileText, ExternalLink, Database } from 'lucide-react';
import PortalNavigation from '../components/PortalNavigation';

export default function LayerValidatorPanel() {
  const { roundId } = useParams();
  const navigate = useNavigate();
  const [round, setRound] = useState<any>(null);
  const [did, setDid] = useState('');
  const [signal, setSignal] = useState(0.5);
  const [vote, setVote] = useState(1);
  const [votedDids, setVotedDids] = useState<string[]>([]);
  const [justVoted, setJustVoted] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loadingError, setLoadingError] = useState<string | null>(null);
  const [finalizing, setFinalizing] = useState(false);
  const [voteCount, setVoteCount] = useState(0);

  useEffect(() => {
    if (roundId) {
      // Use the shared api instance (relative path + Vercel rewrite) instead of
      // hardcoding VITE_API_URL || localhost:4000, which broke in production.
      apiGetRound(roundId)
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
      <div className="max-w-xl mx-auto py-20 px-4 text-center mt-10 card p-5 sm:p-8 bg-white/[0.04] border border-white/10 text-gray-100">
        <h2 className="text-lg font-bold mb-2 uppercase tracking-wider text-white">No Active Round Selected</h2>
        <p className="text-gray-400 text-sm mb-6">
          To view the voting dashboard, you must first initiate a round.
        </p>
        <p className="text-xs mono text-purple-400 bg-[#1C1633] border border-white/5 p-3 rounded">
          Workflow: Go to Validation Layer (03) → Initiate Round → System will redirect you here.
        </p>
      </div>
    );
  }

  // Handle Fetch Errors
  if (loadingError) {
    return (
      <div className="max-w-xl mx-auto py-20 px-4 text-center mt-10 card p-5 sm:p-8 bg-white/[0.04] border border-red-500/30 text-gray-100">
        <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
        <h2 className="text-lg font-bold text-white">Round Not Found</h2>
        <p className="text-red-400 text-sm mt-2">{loadingError}</p>
        <p className="text-xs mt-4 mono text-gray-400 bg-[#1C1633] border border-white/5 p-2 rounded">
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
    if (res.error) { setError(res.error); return; }

    // Track who has voted and how many, then reset the form for the NEXT voter —
    // no full-page refresh needed. (Demo convenience: one operator can cast each
    // panel member's single vote in turn.)
    setVotedDids(prev => prev.includes(did) ? prev : [...prev, did]);
    if (typeof res.count === 'number') setVoteCount(res.count);
    setJustVoted(did);
    // reset selection so the next validator can be picked
    setDid('');
    setSignal(0.5);
    setVote(1);
    setTimeout(() => setJustVoted(null), 2500);
  }

  // Close the round and mint a VIC from the real collected votes.
  async function handleFinalize() {
    if (!roundId) return;
    setFinalizing(true);
    setError(null);
    try {
      const res = await apiFinalizeRound({ round_id: roundId, ground_truth: null });
      if (res?.vic?.vic_id) {
        // Send the user to the VIC share page for the freshly minted credential.
        navigate(`/vic/${res.vic.vic_id}`);
      } else {
        setError('Finalize succeeded but no VIC was returned.');
      }
    } catch (e: any) {
      setError(e?.response?.data?.error || 'Failed to finalize round.');
    } finally {
      setFinalizing(false);
    }
  }

  return (
    <div className="max-w-5xl mx-auto py-10 px-4 text-gray-100">
      <div className="mb-8">
        <h1 className="text-2xl font-bold mb-2 text-white uppercase tracking-wider">Validation Dashboard</h1>
        <p className="text-gray-500 text-sm mono">Round ID: {roundId}</p>
      </div>

      {/* Honest demo-mode note */}
      <div className="mb-6 p-3 rounded-lg border border-amber-500/25 bg-amber-500/[0.06] text-[12px] text-amber-200/90 leading-relaxed">
        <b>Demo mode:</b> for usability, this screen lets one operator cast each panel member's
        vote in turn — you can pick any validator and submit their signal. In the live launch, each
        selected validator signs in independently, sees only their own decentralised identity (DID),
        and casts exactly one vote. The one-DID-one-vote rule and stratified selection are already real.
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-4">
          <div className="card p-5 bg-white/[0.04] border border-white/10">
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
          <div className="card p-6 bg-white/[0.04] border border-white/10">
            <h2 className="text-lg font-bold mb-1 text-white uppercase tracking-wider">Claim Verification</h2>
            <p className="text-sm text-gray-300 mb-4 bg-purple-500/5 p-3 rounded border border-purple-500/20 leading-relaxed">{claimDescription}</p>

            {/* Evidence the firm submitted — validators review this before voting */}
            <div className="mb-4">
              <h3 className="text-[10px] uppercase tracking-wider text-gray-500 mb-2 flex items-center gap-1.5">
                <FileText className="w-3 h-3" /> Submitted evidence
              </h3>
              {round.evidence?.walrus_blob_id ? (
                <div className="rounded border border-teal-500/30 bg-teal-500/5 overflow-hidden">
                  {/* If it's an image, show the real thing inline */}
                  {(round.evidence.content_type || '').startsWith('image/') && (
                    <a href={evidenceUrl(round.evidence.walrus_blob_id)} target="_blank" rel="noopener noreferrer" className="block bg-white/[0.03]">
                      <img src={evidenceUrl(round.evidence.walrus_blob_id)}
                        alt={round.evidence.filename || 'Evidence'}
                        className="w-full max-h-72 object-contain" />
                    </a>
                  )}
                  <a href={evidenceUrl(round.evidence.walrus_blob_id)}
                    target="_blank" rel="noopener noreferrer"
                    className="flex items-center justify-between gap-3 p-3 hover:bg-teal-500/10 transition-colors group">
                    <div className="overflow-hidden">
                      <p className="text-xs font-semibold text-teal-300 truncate">{round.evidence.filename || 'Evidence file'}</p>
                      <p className="text-[10px] mono text-gray-500 truncate">
                        {(round.evidence.content_type || 'file')} · stored on Walrus · open / download
                      </p>
                    </div>
                    <ExternalLink className="w-4 h-4 text-teal-400 flex-shrink-0 group-hover:translate-x-0.5 transition-transform" />
                  </a>
                </div>
              ) : (
                <p className="text-xs text-gray-600 italic p-3 rounded border border-white/5 bg-white/[0.02]">
                  No evidence file was attached — vote on the declaration above.
                </p>
              )}
            </div>

            {/* Optional system impact score — guidance only, clearly flagged */}
            {round.auto_score && (
              <div className="mb-6 p-3 rounded border border-purple-500/25 bg-purple-500/[0.05]">
                <h3 className="text-[10px] uppercase tracking-wider text-purple-300 mb-2 flex items-center gap-1.5">
                  <Database className="w-3 h-3" /> System impact score · optional & automated
                </h3>
                <div className="grid grid-cols-3 gap-2 text-center mb-2">
                  <div>
                    <div className="text-[9px] mono uppercase text-gray-500">Ambition</div>
                    <div className="text-base font-mono text-white">{round.auto_score.ambition_multiplier ?? 'N/A'}x</div>
                  </div>
                  <div>
                    <div className="text-[9px] mono uppercase text-gray-500">Adjusted</div>
                    <div className="text-base font-mono text-teal-400">{round.auto_score.adjusted_score ?? 'N/A'}x</div>
                  </div>
                  <div>
                    <div className="text-[9px] mono uppercase text-gray-500">SDG gap</div>
                    <div className="text-base font-mono text-emerald-400">{round.auto_score.sdg_gap ?? 'N/A'}x</div>
                  </div>
                </div>
                <p className="text-[10px] text-gray-500 leading-relaxed">
                  vs {round.auto_score.benchmark_source} benchmark
                  {round.auto_score.illustrative ? ' (illustrative)' : ''}. Automated guidance — it may be
                  imperfect. Use your own judgement on the claim and evidence.
                </p>
              </div>
            )}
            
            <div className="space-y-6">
              {/* Voting progress so the operator sees how many of the panel have voted */}
              <div>
                <div className="flex items-center justify-between text-[11px] mono mb-1.5">
                  <span className="text-gray-400 uppercase tracking-wide">Panel progress</span>
                  <span className="text-teal-300">{voteCount} / {panel.length} voted</span>
                </div>
                <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-teal-500 to-purple-500 transition-all duration-500"
                    style={{ width: `${panel.length ? (voteCount / panel.length) * 100 : 0}%` }} />
                </div>
                {justVoted && (
                  <p className="text-[11px] text-emerald-400 mt-1.5">✓ Vote recorded — select the next validator.</p>
                )}
              </div>

              <div>
                <label className="block text-xs uppercase mb-2 font-semibold text-gray-400 tracking-wide">Select your Identity</label>
                <select value={did} className="w-full border border-white/10 rounded p-2 text-sm bg-[#1C1633] text-white focus:ring-1 focus:ring-purple-500 outline-none" onChange={(e) => setDid(e.target.value)}>
                  <option value="">-- Choose your DID from the panel --</option>
                  {panel.map((v: any) => (
                    <option key={v.did} value={v.did} disabled={votedDids.includes(v.did)}>
                      {v.full_name}{votedDids.includes(v.did) ? ' ✓ voted' : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs uppercase mb-2 font-semibold text-gray-400 tracking-wide">Peer Prediction (Signal: {signal})</label>
                <input type="range" min="0" max="1" step="0.1" value={signal}
                       className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer accent-purple-500"
                       onChange={(e) => setSignal(parseFloat(e.target.value))} />
              </div>

              <div>
                <label className="block text-xs uppercase mb-2 font-semibold text-gray-400 tracking-wide">Vote</label>
                <select value={vote} className="w-full border border-white/10 rounded p-2 text-sm bg-[#1C1633] text-white focus:ring-1 focus:ring-purple-500 outline-none" onChange={(e) => setVote(parseInt(e.target.value))}>
                  <option value="1">Approve</option>
                  <option value="0">Reject</option>
                </select>
              </div>

              {error && <p className="text-xs text-red-400 font-mono bg-red-500/10 border border-red-500/20 p-2 rounded">{error}</p>}

              {voteCount >= panel.length ? (
                <p className="w-full text-center bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 py-3 rounded font-bold text-sm">
                  All {panel.length} validators have voted ✓ — finalize below to mint the VIC.
                </p>
              ) : (
                <button onClick={handleSubmit} disabled={!did}
                  className="w-full bg-purple-500 text-white py-3 rounded font-bold transition-all hover:bg-purple-400 disabled:bg-white/5 disabled:text-gray-500 disabled:cursor-not-allowed">
                  {did ? 'Submit Verification Signal' : 'Select a validator to vote'}
                </button>
              )}
            </div>
          </div>

          {/* Finalize: convert the real collected votes into a minted VIC */}
          <div className="card p-6 bg-white/[0.04] border border-teal-500/20">
            <h3 className="text-xs font-bold uppercase mb-2 tracking-wider text-teal-300">Close Round &amp; Mint VIC</h3>
            <p className="text-xs text-gray-400 mb-4 leading-relaxed">
              Once the panel has voted, finalize the round to run Compact SPP scoring over the
              collected votes and mint the Verified Impact Claim (logged to Hedera, anchored to Walrus).
              {voteCount > 0 && <span className="text-teal-400 mono"> {voteCount} vote(s) recorded.</span>}
            </p>
            <button onClick={handleFinalize} disabled={finalizing}
              className="w-full border border-teal-500/40 hover:bg-teal-500/10 text-teal-300 py-2.5 rounded font-bold text-sm transition-colors disabled:opacity-50">
              {finalizing ? 'Finalizing & minting...' : 'Finalize Round → Mint VIC'}
            </button>
          </div>
        </div>
      </div>

      {/* SMART NAVIGATION IMPLEMENTED PERFECTLY HERE */}
      <PortalNavigation />

    </div>
  );
}