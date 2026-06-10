import { useState } from 'react';
import { apiScoreImpact } from '../lib/api';
import { Activity, ShieldAlert, BarChart3, Calculator } from 'lucide-react';

export default function ImpactAnalytics() {
  const [scorecard, setScorecard] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  // This is sample data to test the engine from the UI
  const testPortfolio = [
    { name: "Winnow", sector: "Food Waste", geo: "GB", capital_k: 100, reported_target: 380, actual_result: 360 },
    { name: "EduTech", sector: "Education", geo: "US", capital_k: 50, reported_target: 100, actual_result: null }, // This will trigger the Shadow Path
    { name: "AgriCorp", sector: "Food Waste", geo: "BR", capital_k: 200, reported_target: 500, actual_result: 450 }
  ];

  async function handleRunScoring() {
    setLoading(true);
    try {
      const result = await apiScoreImpact(testPortfolio);
      setScorecard(result);
    } catch (error: any) {
      alert(error.message);
    } finally {
      setLoading(false);
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
          <div className="card p-5 bg-black/40 border border-white/10 rounded-xl flex gap-6">
            <div>
              <div className="text-[10px] uppercase tracking-widest text-gray-500 mb-1">Global Mean</div>
              <div className="text-xl font-bold font-mono text-teal-400">{scorecard.global_mean} per $1k</div>
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-widest text-gray-500 mb-1">Generated At</div>
              <div className="text-sm font-mono text-gray-300 mt-1">{new Date(scorecard.generated_at).toLocaleString()}</div>
            </div>
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

          {/* Methodology Notes */}
          <div className="mt-8 p-4 bg-purple-900/10 border border-purple-500/20 rounded-xl">
            <h4 className="text-xs uppercase font-bold text-purple-400 mb-2 tracking-widest">Methodology Notes</h4>
            <ul className="list-disc pl-4 space-y-1">
              {scorecard.honesty_notes.map((note: string, i: number) => (
                <li key={i} className="text-[11px] text-gray-400 leading-relaxed">{note}</li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}