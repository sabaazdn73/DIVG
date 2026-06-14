import { useState } from 'react';
import { apiScoreImpact, apiStoreScorecard, apiAskAgent } from '../lib/api';
import { Activity, Leaf, ShieldAlert, BarChart, PlusCircle, Brain, Database, Send } from 'lucide-react';

export default function LayerAnalytics() {
  // Real-world example: Winnow (food waste / GHG). Now expressed as an annualized
  // pace of change (%), matching the GIIN impact-performance benchmark model.
  const [formData, setFormData] = useState({
    name: 'Winnow Solutions',
    sector: 'food waste',
    geo: 'GB',
    target_pace: 9.0,   // annualized % improvement targeted
    actual_pace: 7.5,   // annualized % improvement realized (optional)
  });

  const [scorecard, setScorecard] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [storing, setStoring] = useState(false);
  const [walrusBlobId, setWalrusBlobId] = useState<string | null>(null);

  // AI Agent Chat State
  const [chatInput, setChatInput] = useState('');
  const [chatLog, setChatLog] = useState<{ role: string; text: string }[]>([]);
  const [agentThinking, setAgentThinking] = useState(false);
  

// --- 1. Run Omid's Thesis Math Engine ---
  async function handleEvaluate(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      // No simulated peers needed: the benchmark now comes from the real,
      // GIIN-sourced sector dataset on the backend (lib/sector_benchmarks.js).
      const result = await apiScoreImpact([formData]);

      console.log("🧠 ENGINE RESPONSE:", result);

      // Bulletproof parser: Checks if the backend sent an Array OR an Object
      let companiesArray = [];
      if (Array.isArray(result)) {
         companiesArray = result;
      } else if (result && Array.isArray(result.companies)) {
         companiesArray = result.companies;
      }

      // Check if we successfully extracted the data
      if (companiesArray.length > 0) {
        const firmScorecard = companiesArray.find((c: any) => c.name === formData.name);
        if (firmScorecard) {
          setScorecard(firmScorecard);
        } else {
          throw new Error("Your firm's data was lost during calculation.");
        }
      } else {
        throw new Error("Backend returned empty or unrecognized data structure.");
      }

    } catch (error: any) {
      alert("Evaluation failed: " + error.message);
    } finally {
      setLoading(false);
    }
  }


  // --- 2. Optional Feature: Immutable Storage (Walrus) ---
  async function handleAttachToVIC() {
    if (!scorecard) return;
    setStoring(true);
    try {
      const payload = {
        title: `${formData.name} Impact Evaluation`,
        timestamp: new Date().toISOString(),
        evaluation_data: scorecard
      };
      const response = await apiStoreScorecard(payload);
      if (!response.blobId) throw new Error('Walrus did not return a blob id');
      setWalrusBlobId(response.blobId);
      alert("Scorecard permanently anchored to decentralized storage!");
    } catch (error: any) {
      alert("Failed to store on Walrus: " + error.message);
    } finally {
      setStoring(false);
    }
  }

  // --- 3. AI Agent Contextual Breakdown ---
  async function handleAskAgent(e: React.FormEvent) {
    e.preventDefault();
    if (!chatInput.trim() || !scorecard) return;

    const userMessage = chatInput;
    setChatLog(prev => [...prev, { role: 'user', text: userMessage }]);
    setChatInput('');
    setAgentThinking(true);

    try {
      // Mor 4: if the scorecard has been anchored to Walrus, pass its blobId so
      // the agent reads the immutable record from Walrus instead of client state.
      const response = await apiAskAgent(userMessage, scorecard, walrusBlobId);
      setChatLog(prev => [...prev, { role: 'agent', text: response.reply }]);
    } catch (error: any) {
      setChatLog(prev => [...prev, { role: 'agent', text: "Error connecting to AI Agent." }]);
    } finally {
      setAgentThinking(false);
    }
  }

  return (
    <div className="max-w-6xl mx-auto py-10 px-4 text-gray-100 font-['Inter',sans-serif]">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
          <Activity className="text-teal-400" /> Premium Impact Evaluation Portal
        </h1>
        <p className="text-gray-400 text-sm max-w-2xl">
          Optional layer: scores a firm's annualized impact pace of change against its sector's
          GIIN peer median and the SDG-aligned threshold. Real GIIN benchmark figures are used
          where published (energy, financial inclusion); other sectors are clearly flagged as
          illustrative. Reports a realized score when an actual pace exists, or an honest shadow
          path when it doesn't — then anchors the scorecard to Walrus.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* LEFT COLUMN: DATA INPUT FORM */}
        <div className="card bg-white/[0.04] border border-white/10 p-6 rounded-xl h-fit">
          <h2 className="text-lg font-semibold mb-4 text-white flex items-center gap-2">
            <Database className="w-4 h-4 text-teal-400" /> Firm Performance Inputs
          </h2>
          <form onSubmit={handleEvaluate} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-gray-400 mb-1">Firm Name</label>
                <input type="text" className="w-full bg-[#1C1633] border border-white/10 rounded p-2 text-sm text-white focus:border-teal-500 outline-none" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Sector (selects the benchmark)</label>
                <select className="w-full bg-[#1C1633] border border-white/10 rounded p-2 text-sm text-white focus:border-teal-500 outline-none" value={formData.sector} onChange={e => setFormData({...formData, sector: e.target.value})}>
                  <option value="energy">Energy (GIIN)</option>
                  <option value="financial inclusion">Financial inclusion (GIIN)</option>
                  <option value="climate">Climate / GHG (IPCC)</option>
                  <option value="food waste">Food waste (illustrative)</option>
                  <option value="agriculture">Agriculture (illustrative)</option>
                  <option value="healthcare">Healthcare (illustrative)</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="border-l-2 border-amber-500/50 pl-3">
                <label className="block text-xs text-amber-400 mb-1">Target pace (% / yr)</label>
                <input type="number" step="0.1" className="w-full bg-[#1C1633] border border-white/10 rounded p-2 text-sm text-white focus:border-amber-500 outline-none" value={formData.target_pace} onChange={e => setFormData({...formData, target_pace: Number(e.target.value)})} />
              </div>
              <div className="border-l-2 border-emerald-500/50 pl-3">
                <label className="block text-xs text-emerald-400 mb-1">Actual pace (% / yr, optional)</label>
                <input type="number" step="0.1" className="w-full bg-[#1C1633] border border-white/10 rounded p-2 text-sm text-white focus:border-emerald-500 outline-none" value={formData.actual_pace} onChange={e => setFormData({...formData, actual_pace: Number(e.target.value)})} />
              </div>
            </div>
            <p className="text-[10px] text-gray-500 italic">
              Pace = annualized % improvement (e.g. annual GHG reduction). Compared to the sector's
              GIIN peer median and the SDG-aligned threshold.
            </p>

            <button type="submit" disabled={loading} className="w-full bg-teal-600 hover:bg-teal-500 text-white font-bold py-3 rounded mt-4 transition-colors disabled:opacity-50">
              {loading ? 'Processing Model Metrics...' : 'Calculate Structural Score'}
            </button>
          </form>
        </div>

        {/* RIGHT COLUMN: EVALUATION SCORECARD & AI AGENT */}
        <div className="space-y-6">
          {!scorecard ? (
            <div className="card bg-[#1C1633] border border-white/5 p-12 rounded-xl text-center text-gray-500 flex flex-col items-center justify-center min-h-[350px]">
              <BarChart className="w-12 h-12 mb-3 opacity-20 text-teal-400" />
              <p className="text-sm max-w-xs">Enter your verification metrics on the left to run the dynamic benchmarking analysis.</p>
            </div>
          ) : (
            <>
              {/* Scorecard Results */}
              <div className="card bg-[#1C1633] border border-teal-500/30 p-6 rounded-xl space-y-4 animate-fade-in">
                <div className="flex justify-between items-center border-b border-white/10 pb-3">
                  <h3 className="text-lg font-bold text-white font-mono">{scorecard.name} Report Summary</h3>
                  {scorecard.path === 'shadow' ? (
                    <span className="bg-amber-500/20 text-amber-400 text-xs px-2 py-1 rounded flex items-center gap-1"><ShieldAlert className="w-3 h-3" /> Shadow Path</span>
                  ) : (
                    <span className="bg-emerald-500/20 text-emerald-400 text-xs px-2 py-1 rounded flex items-center gap-1"><Leaf className="w-3 h-3" /> Realized Data</span>
                  )}
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <div className="text-xs text-gray-500 uppercase tracking-wider">Ambition</div>
                    <div className="text-2xl font-mono text-white mt-1">{scorecard.ambition_multiplier ?? 'N/A'}x</div>
                    <div className="text-[10px] text-gray-600">vs peer median</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500 uppercase tracking-wider">Adjusted</div>
                    <div className={`text-2xl font-mono mt-1 ${scorecard.adjusted_score ? 'text-teal-400' : 'text-gray-600'}`}>
                      {scorecard.adjusted_score ? `${scorecard.adjusted_score}x` : 'N/A'}
                    </div>
                    <div className="text-[10px] text-gray-600">actual vs peer</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500 uppercase tracking-wider">SDG gap</div>
                    <div className={`text-2xl font-mono mt-1 ${scorecard.sdg_gap >= 1 ? 'text-emerald-400' : 'text-amber-400'}`}>
                      {scorecard.sdg_gap ?? 'N/A'}x
                    </div>
                    <div className="text-[10px] text-gray-600">vs SDG threshold</div>
                  </div>
                </div>

                {/* Benchmark provenance — real vs illustrative is shown honestly */}
                <div className={`p-3 rounded text-[11px] border-l-2 ${scorecard.benchmark_source === 'GIIN' ? 'bg-emerald-950/20 border-emerald-500 text-emerald-200' : scorecard.benchmark_source === 'IPCC' ? 'bg-sky-950/20 border-sky-500 text-sky-200' : 'bg-amber-950/20 border-amber-500 text-amber-200'}`}>
                  <div className="font-semibold mb-1">
                    Benchmark: {scorecard.benchmark_label} · source {scorecard.benchmark_source}
                    {scorecard.illustrative && ' (illustrative)'}
                  </div>
                  <div className="opacity-80">{scorecard.benchmark_citation}</div>
                  <div className="opacity-60 mt-1">
                    Peer median {scorecard.peer_median_pace}% · SDG threshold {scorecard.sdg_threshold_pace}% / yr
                    {scorecard.legacy_mode && ' · legacy input mode'}
                  </div>
                </div>

                <div className="bg-white/5 p-3 rounded text-xs text-gray-300 border-l-2 border-teal-500">
                  <span className="font-semibold text-white">Engine Assessment:</span> {scorecard.note || "Metrics processed successfully against global parameters."}
                </div>

                <button onClick={handleAttachToVIC} disabled={storing} className="w-full border border-teal-500/40 hover:bg-teal-500/10 text-teal-400 font-bold py-2.5 rounded flex items-center justify-center gap-2 text-sm transition-colors disabled:opacity-50">
                  <PlusCircle className="w-4 h-4" /> {storing ? 'Uploading Payload...' : 'Attach Scorecard to VIC'}
                </button>

                {walrusBlobId && (
                  <div className="bg-purple-950/30 border border-purple-500/20 rounded p-2 text-[10px] font-mono text-purple-300 break-all">
                    <strong>Walrus Blob ID:</strong> {walrusBlobId}
                  </div>
                )}
              </div>
              

              


              {/* Connected AI Benchmarking Agent */}
              <div className="card bg-white/[0.05] border border-white/10 p-4 rounded-xl flex flex-col h-[320px]">
                <div className="flex items-center gap-2 border-b border-white/10 pb-2 mb-2">
                  <Brain className="w-4 h-4 text-purple-400" />
                  <span className="text-xs font-bold uppercase tracking-wider text-purple-300">Walrus AI Auditing Agent</span>
                </div>

                {/* Chat History */}
                <div className="flex-1 overflow-y-auto space-y-2 p-1 text-xs scrollbar-thin">
                  <div className="bg-purple-950/20 border border-purple-900/40 p-2 rounded text-purple-200">
                    Hello, I have indexed your generated scorecard. Ask me anything about your sector benchmark positioning or data transparency.
                  </div>
                  {chatLog.map((c, idx) => (
                    <div key={idx} className={`p-2 rounded max-w-[85%] ${c.role === 'user' ? 'bg-teal-600/20 border border-teal-500/20 text-teal-100 ml-auto' : 'bg-white/5 text-gray-300'}`}>
                      {c.text}
                    </div>
                  ))}
                  {agentThinking && <div className="text-gray-500 italic animate-pulse">Agent exploring the ledger...</div>}
                </div>

                {/* Chat Input */}
                <form onSubmit={handleAskAgent} className="mt-2 flex gap-1">
                  <input type="text" placeholder="Ask agent about the score context..." className="flex-1 bg-[#1C1633] border border-white/10 rounded px-2 py-1.5 text-xs text-white focus:border-purple-500 outline-none" value={chatInput} onChange={e => setChatInput(e.target.value)} />
                  <button type="submit" className="bg-purple-600 hover:bg-purple-500 p-1.5 rounded text-white transition-colors">
                    <Send className="w-3 h-3" />
                  </button>
                </form>
              </div>
            </>
          )}
        </div>

      </div>
    </div>
  );
}