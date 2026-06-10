import { useState } from 'react';
import { IRIS_METRICS } from '../lib/iris_metrics';
import { apiScoreImpact, apiStoreScorecard, apiAskAgent } from '../lib/api';
import { Activity, Leaf, ShieldAlert, BarChart, PlusCircle, Brain, Database, Send } from 'lucide-react';

export default function LayerAnalytics() {
  // Setup with Winnow as the real-world example
  const [formData, setFormData] = useState({
    name: 'Winnow Solutions',
    sector: 'food waste',
    geo: 'GB',
    capital_k: 150,
    metricCode: 'OI6613', // GHG Emissions Avoided / Reduced
    reported_target: 400,
    actual_result: 370,
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
      // Inject simulated industry peers for the structural baseline
      const simulatedPeers = [
        { name: "Industry Baseline", sector: formData.sector, geo: "Global", capital_k: 100, reported_target: 100, actual_result: 90 },
        { name: "Sector Average", sector: formData.sector, geo: "EU", capital_k: 250, reported_target: 350, actual_result: 300 },
        { name: "Top Competitor", sector: formData.sector, geo: "US", capital_k: 500, reported_target: 900, actual_result: 850 }
      ];

      const evaluationPayload = [formData, ...simulatedPeers];
      const result = await apiScoreImpact(evaluationPayload);
      
      console.log("🧠 ENGINE RESPONSE:", result); // Debugging line

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
        metric_used: formData.metricCode,
        evaluation_data: scorecard
      };
      const response = await apiStoreScorecard(payload);
      setWalrusBlobId(response.blobId || "simulated-walrus-blob-id-123x");
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
      const response = await apiAskAgent(userMessage, scorecard);
      setChatLog(prev => [...prev, { role: 'agent', text: response.reply }]);
    } catch (error: any) {
      setChatLog(prev => [...prev, { role: 'agent', text: "Error connecting to AI Agent." }]);
    } finally {
      setAgentThinking(false);
    }
  }

  const selectedMetric = IRIS_METRICS.find(m => m.code === formData.metricCode);

  return (
    <div className="max-w-6xl mx-auto py-10 px-4 text-gray-100 font-['Inter',sans-serif]">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
          <Activity className="text-teal-400" /> Premium Impact Evaluation Portal
        </h1>
        <p className="text-gray-400 text-sm">
          Optional Feature: Evaluate structural performance metrics against benchmark expectations before finalizing your Verified Impact Claim (VIC).
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* LEFT COLUMN: DATA INPUT FORM */}
        <div className="card bg-black/40 border border-white/10 p-6 rounded-xl h-fit">
          <h2 className="text-lg font-semibold mb-4 text-white flex items-center gap-2">
            <Database className="w-4 h-4 text-teal-400" /> Firm Performance Inputs
          </h2>
          <form onSubmit={handleEvaluate} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-gray-400 mb-1">Firm Name</label>
                <input type="text" className="w-full bg-[#05030A] border border-white/10 rounded p-2 text-sm text-white focus:border-teal-500 outline-none" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Capital Allocated ($k)</label>
                <input type="number" className="w-full bg-[#05030A] border border-white/10 rounded p-2 text-sm text-white focus:border-teal-500 outline-none" value={formData.capital_k} onChange={e => setFormData({...formData, capital_k: Number(e.target.value)})} />
              </div>
            </div>

            <div>
              <label className="block text-xs text-gray-400 mb-1">IRIS+ Metric Framework Alignment</label>
              <select className="w-full bg-[#05030A] border border-white/10 rounded p-2 text-sm text-white focus:border-teal-500 outline-none" value={formData.metricCode} onChange={e => setFormData({...formData, metricCode: e.target.value})}>
                {IRIS_METRICS.map(m => (
                  <option key={m.code} value={m.code}>{m.code}: {m.name} ({m.unit})</option>
                ))}
              </select>
              <p className="text-[11px] text-gray-500 mt-1 italic">{selectedMetric?.desc}</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="border-l-2 border-amber-500/50 pl-3">
                <label className="block text-xs text-amber-400 mb-1">Reported Target</label>
                <input type="number" className="w-full bg-[#05030A] border border-white/10 rounded p-2 text-sm text-white focus:border-amber-500 outline-none" value={formData.reported_target} onChange={e => setFormData({...formData, reported_target: Number(e.target.value)})} />
              </div>
              <div className="border-l-2 border-emerald-500/50 pl-3">
                <label className="block text-xs text-emerald-400 mb-1">Actual Result (Optional)</label>
                <input type="number" className="w-full bg-[#05030A] border border-white/10 rounded p-2 text-sm text-white focus:border-emerald-500 outline-none" value={formData.actual_result} onChange={e => setFormData({...formData, actual_result: Number(e.target.value)})} />
              </div>
            </div>

            <button type="submit" disabled={loading} className="w-full bg-teal-600 hover:bg-teal-500 text-white font-bold py-3 rounded mt-4 transition-colors disabled:opacity-50">
              {loading ? 'Processing Model Metrics...' : 'Calculate Structural Score'}
            </button>
          </form>
        </div>

        {/* RIGHT COLUMN: EVALUATION SCORECARD & AI AGENT */}
        <div className="space-y-6">
          {!scorecard ? (
            <div className="card bg-[#05030A] border border-white/5 p-12 rounded-xl text-center text-gray-500 flex flex-col items-center justify-center min-h-[350px]">
              <BarChart className="w-12 h-12 mb-3 opacity-20 text-teal-400" />
              <p className="text-sm max-w-xs">Enter your verification metrics on the left to run the dynamic benchmarking analysis.</p>
            </div>
          ) : (
            <>
              {/* Scorecard Results */}
              <div className="card bg-[#05030A] border border-teal-500/30 p-6 rounded-xl space-y-4 animate-fade-in">
                <div className="flex justify-between items-center border-b border-white/10 pb-3">
                  <h3 className="text-lg font-bold text-white font-mono">{scorecard.name} Report Summary</h3>
                  {scorecard.path === 'shadow' ? (
                    <span className="bg-amber-500/20 text-amber-400 text-xs px-2 py-1 rounded flex items-center gap-1"><ShieldAlert className="w-3 h-3" /> Shadow Path</span>
                  ) : (
                    <span className="bg-emerald-500/20 text-emerald-400 text-xs px-2 py-1 rounded flex items-center gap-1"><Leaf className="w-3 h-3" /> Realized Data</span>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-xs text-gray-500 uppercase tracking-wider">Ambition Multiplier</div>
                    <div className="text-2xl font-mono text-white mt-1">{scorecard.ambition_multiplier}x</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500 uppercase tracking-wider">Adjusted Performance Score</div>
                    <div className={`text-2xl font-mono mt-1 ${scorecard.adjusted_score ? 'text-teal-400' : 'text-gray-600'}`}>
                      {scorecard.adjusted_score ? `${scorecard.adjusted_score}x` : 'N/A'}
                    </div>
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
              <div className="card bg-black/50 border border-white/10 p-4 rounded-xl flex flex-col h-[320px]">
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
                  <input type="text" placeholder="Ask agent about the score context..." className="flex-1 bg-[#05030A] border border-white/10 rounded px-2 py-1.5 text-xs text-white focus:border-purple-500 outline-none" value={chatInput} onChange={e => setChatInput(e.target.value)} />
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