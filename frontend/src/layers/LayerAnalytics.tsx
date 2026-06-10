import { useState } from 'react';
import { apiScoreImpact, apiStoreScorecard, apiAskAgent } from '../lib/api';
import { Activity, ShieldAlert, BarChart3, Calculator, Database, Bot, Send } from 'lucide-react';

export default function LayerAnalytics() {
  const [scorecard, setScorecard] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  
  // Walrus & Agent State
  const [walrusBlobId, setWalrusBlobId] = useState<string | null>(null);
  const [storing, setStoring] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [chatLog, setChatLog] = useState<{role: string, text: string}[]>([]);
  const [agentThinking, setAgentThinking] = useState(false);

  // Sample data simulating Omid's structured data
  const testPortfolio = [
    { name: "Winnow", sector: "Food Waste", geo: "GB", capital_k: 100, reported_target: 380, actual_result: 360 },
    { name: "EduTech", sector: "Education", geo: "US", capital_k: 50, reported_target: 100, actual_result: null },
    { name: "AgriCorp", sector: "Food Waste", geo: "BR", capital_k: 200, reported_target: 500, actual_result: 450 }
  ];

  async function handleRunScoring() {
    setLoading(true);
    try {
      const result = await apiScoreImpact(testPortfolio);
      setScorecard(result);
      setWalrusBlobId(null); // Reset blob ID if re-running
      setChatLog([]);
    } catch (error: any) {
      alert(error.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleStoreToWalrus() {
    if (!scorecard) return;
    setStoring(true);
    try {
      const res = await apiStoreScorecard(scorecard);
      setWalrusBlobId(res.blobId);
      setChatLog([{ role: 'agent', text: 'Scorecard secured on Walrus. I have loaded it into my memory. What would you like to know about this portfolio?' }]);
    } catch (error: any) {
      alert("Walrus Storage Error: Make sure your local Walrus publisher is running.\n\n" + error.message);
    } finally {
      setStoring(false);
    }
  }

  async function handleAskAgent(e: React.FormEvent) {
    e.preventDefault();
    if (!chatInput.trim() || !walrusBlobId) return;

    const question = chatInput;
    setChatInput('');
    setChatLog(prev => [...prev, { role: 'user', text: question }]);
    setAgentThinking(true);

    try {
      const res = await apiAskAgent(walrusBlobId, question);
      setChatLog(prev => [...prev, { role: 'agent', text: res.answer }]);
    } catch (error: any) {
      setChatLog(prev => [...prev, { role: 'agent', text: `Error: ${error.message}` }]);
    } finally {
      setAgentThinking(false);
    }
  }

  return (
    <div className="max-w-5xl mx-auto py-10 px-4 text-gray-100 font-['Inter',sans-serif]">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white tracking-tight mb-2 flex items-center gap-3">
          <Activity className="text-purple-400" /> Ambition-Adjusted Analytics
        </h1>
        <p className="text-gray-400 text-sm">
          Run the Bayesian shrinkage model to compare reported impacts against macro-adjusted global benchmarks.
        </p>
      </div>

      {!scorecard ? (
        <button 
          onClick={handleRunScoring} 
          disabled={loading}
          className="btn bg-purple-600 hover:bg-purple-500 text-white font-bold py-3 px-6 rounded-lg transition-all flex items-center gap-2 shadow-[0_0_20px_rgba(147,51,234,0.3)] disabled:opacity-50"
        >
          <Calculator className="w-5 h-5" />
          {loading ? 'Crunching Macro Data & Benchmarks...' : 'Run Portfolio Scoring Engine'}
        </button>
      ) : (
        <div className="space-y-6">
          {/* Global Stats */}
          <div className="card p-5 bg-black/40 border border-white/10 rounded-xl flex justify-between items-center flex-wrap gap-4">
            <div className="flex gap-6">
              <div>
                <div className="text-[10px] uppercase tracking-widest text-gray-500 mb-1">Global Mean</div>
                <div className="text-xl font-bold font-mono text-teal-400">{scorecard.global_mean} per $1k</div>
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-widest text-gray-500 mb-1">Generated At</div>
                <div className="text-sm font-mono text-gray-300 mt-1">{new Date(scorecard.generated_at).toLocaleString()}</div>
              </div>
            </div>
            
            {/* NEW: Walrus Storage Button */}
            {!walrusBlobId ? (
              <button onClick={handleStoreToWalrus} disabled={storing} className="btn bg-white/10 hover:bg-white/20 border border-white/20 text-white flex items-center gap-2 py-2 px-4 rounded-lg disabled:opacity-50 transition-all">
                <Database className="w-4 h-4" />
                {storing ? 'Uploading to Walrus...' : 'Store Immutably to Walrus'}
              </button>
            ) : (
              <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/30 px-3 py-2 rounded-lg text-emerald-400 text-xs font-mono">
                <Database className="w-4 h-4" /> Stored: {walrusBlobId.slice(0, 16)}...
              </div>
            )}
          </div>

          {/* Individual Company Scorecards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {scorecard.companies.map((c: any, idx: number) => (
              <div key={idx} className={`p-5 rounded-xl border relative overflow-hidden backdrop-blur-md ${c.path === 'shadow' ? 'bg-amber-900/10 border-amber-500/30' : 'bg-white/5 border-white/10'}`}>
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-lg font-bold text-white">{c.name}</h3>
                    <span className="text-[10px] uppercase tracking-widest text-gray-400">{c.sector} • {c.geo}</span>
                  </div>
                  {c.path === 'shadow' ? (
                    <span className="bg-amber-500/20 text-amber-400 text-[10px] uppercase font-bold px-2 py-1 rounded border border-amber-500/30 flex items-center gap-1">
                      <ShieldAlert className="w-3 h-3" /> Shadow Path
                    </span>
                  ) : (
                    <span className="bg-emerald-500/20 text-emerald-400 text-[10px] uppercase font-bold px-2 py-1 rounded border border-emerald-500/30 flex items-center gap-1">
                      <BarChart3 className="w-3 h-3" /> Real Data
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="bg-[#05030A] p-3 rounded border border-white/5">
                    <div className="text-[9px] uppercase tracking-widest text-gray-500 mb-1">Target Ambition</div>
                    <div className="text-lg font-mono text-white">{c.ambition_multiplier}x</div>
                    <div className="text-[10px] text-gray-400 mt-1">vs Benchmark ({c.expected_benchmark})</div>
                  </div>
                  <div className="bg-[#05030A] p-3 rounded border border-white/5">
                    <div className="text-[9px] uppercase tracking-widest text-gray-500 mb-1">Adjusted Score</div>
                    <div className={`text-lg font-mono ${c.adjusted_score ? 'text-purple-400' : 'text-gray-600'}`}>
                      {c.adjusted_score ? `${c.adjusted_score}x` : 'N/A'}
                    </div>
                  </div>
                </div>

                <p className={`text-[11px] leading-relaxed border-l-2 pl-3 ${c.path === 'shadow' ? 'border-amber-500/50 text-amber-200/70' : 'border-purple-500/50 text-gray-400'}`}>
                  {c.note}
                </p>
              </div>
            ))}
          </div>

          {/* NEW: The Benchmarking Agent UI */}
          {walrusBlobId && (
            <div className="mt-8 card bg-black/40 border border-purple-500/30 rounded-xl overflow-hidden flex flex-col h-[400px]">
              <div className="bg-purple-900/40 p-3 border-b border-purple-500/30 flex items-center gap-2 text-purple-300 font-semibold text-sm">
                <Bot className="w-5 h-5" /> DIVG Benchmarking Agent
              </div>
              
              <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
                {chatLog.map((msg, i) => (
                  <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[80%] p-3 rounded-xl text-sm leading-relaxed ${
                      msg.role === 'user' 
                        ? 'bg-purple-600 text-white rounded-br-none' 
                        : 'bg-[#05030A] border border-white/10 text-gray-300 rounded-bl-none'
                    }`}>
                      {msg.text}
                    </div>
                  </div>
                ))}
                {agentThinking && (
                  <div className="flex justify-start">
                    <div className="bg-[#05030A] border border-white/10 p-3 rounded-xl rounded-bl-none flex items-center gap-2">
                      <span className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" />
                      <span className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                      <span className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }} />
                    </div>
                  </div>
                )}
              </div>

              <form onSubmit={handleAskAgent} className="p-3 bg-black/60 border-t border-white/10 flex gap-2">
                <input 
                  type="text" 
                  value={chatInput}
                  onChange={e => setChatInput(e.target.value)}
                  placeholder="Ask the agent to analyze the immutably stored scorecard..."
                  className="flex-1 bg-[#05030A] border border-white/10 rounded-lg px-4 py-2 text-sm text-white focus:outline-none focus:border-purple-500 transition-colors"
                />
                <button type="submit" disabled={agentThinking || !chatInput.trim()} className="btn bg-purple-600 hover:bg-purple-500 text-white p-2 rounded-lg disabled:opacity-50 transition-colors">
                  <Send className="w-5 h-5" />
                </button>
              </form>
            </div>
          )}

        </div>
      )}
    </div>
  );
}