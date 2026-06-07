import { useState } from 'react';
import { apiVote } from '../lib/api'; // Ensure this exists

export default function LayerValidatorPanel({ roundId, claim }) {
  const [signal, setSignal] = useState(0.5);
  const [vote, setVote]     = useState(1);
  const [submitted, setSubmitted] = useState(false);

  async function handleSubmit() {
    await apiVote({ round_id: roundId, signal, vote });
    setSubmitted(true);
  }

  return (
    <div className="card p-6">
      <h2 className="text-lg font-bold mb-4">Verification Panel</h2>
      <p className="text-sm text-muted mb-6">Claim: {claim.description}</p>
      
      <div className="space-y-4">
        <div>
          <label className="block text-xs mb-2">Peer Prediction (Signal)</label>
          <input type="range" min="0" max="1" step="0.1" 
                 onChange={(e) => setSignal(parseFloat(e.target.value))} />
        </div>
        
        <div>
          <label className="block text-xs mb-2">Your Vote</label>
          <select onChange={(e) => setVote(parseInt(e.target.value))}>
            <option value="1">Approve</option>
            <option value="0">Reject</option>
          </select>
        </div>

        <button onClick={handleSubmit} disabled={submitted}
          className="w-full bg-ink text-white py-2 rounded">
          {submitted ? 'Vote Cast' : 'Submit Verification'}
        </button>
      </div>
    </div>
  );
}