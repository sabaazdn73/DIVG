import { useState } from 'react';
import { apiVote } from '../lib/api';

export default function LayerValidatorPanel({ roundId = "demo-round", did = "did:divg:demo" }) {
  const [signal, setSignal] = useState(0.5);
  const [vote, setVote]     = useState(1);
  const [submitted, setSubmitted] = useState(false);

  async function handleSubmit() {
    await apiVote({ round_id: roundId, did, signal, vote });
    setSubmitted(true);
  }

  return (
    <div className="max-w-xl mx-auto py-10 px-4">
      <div className="card p-6">
        <h2 className="text-lg font-bold mb-4">Voting Panel</h2>
        <p className="text-sm text-muted mb-6">Cast your prediction and vote for the active round.</p>
        
        <div className="space-y-6">
          <div>
            <label className="block text-xs uppercase mb-2">Signal (0.0 - 1.0)</label>
            <input type="range" min="0" max="1" step="0.1" defaultValue={0.5} 
                   className="w-full" onChange={(e) => setSignal(parseFloat(e.target.value))} />
          </div>
          
          <div>
            <label className="block text-xs uppercase mb-2">Vote</label>
            <select className="w-full border rounded p-2" onChange={(e) => setVote(parseInt(e.target.value))}>
              <option value="1">Approve</option>
              <option value="0">Reject</option>
            </select>
          </div>

          <button onClick={handleSubmit} disabled={submitted}
            className="w-full bg-ink text-white py-2 rounded">
            {submitted ? 'Vote Submitted' : 'Submit Vote'}
          </button>
        </div>
      </div>
    </div>
  );
}