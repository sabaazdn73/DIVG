import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { apiVic, VIC } from '../lib/api';
import VICertificate from '../components/VICertificate';

// ════════════════════════════════════════════════════════════════
//  LayerVICShare — full-page, shareable view of a single VIC.
//  Route: /vic/:id  →  loads the VIC by id and renders the
//  Credential of Record on its own page (paste the link anywhere).
// ════════════════════════════════════════════════════════════════

export default function LayerVICShare() {
  const { id } = useParams();
  const [vic, setVic]       = useState<VIC | null>(null);
  const [loading, setLoad]  = useState(true);
  const [error, setError]   = useState<string | null>(null);

  useEffect(() => {
    if (!id) { setError('No credential id provided.'); setLoad(false); return; }
    apiVic(id)
      .then((v) => { setVic(v); setLoad(false); })
      .catch(() => { setError('Credential not found.'); setLoad(false); });
  }, [id]);

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-14">
      {/* breadcrumb / back */}
      <div className="mb-6 flex items-center justify-between">
        <Link to="/vic" className="text-xs mono text-muted hover:text-ink transition-colors">
          ← All credentials
        </Link>
        <span className="text-[10px] mono text-muted">DIVG · Verifiable Impact Credential</span>
      </div>

      {loading && (
        <div className="card p-12 text-center text-sm text-muted mono">Loading credential…</div>
      )}

      {error && !loading && (
        <div className="card p-12 text-center">
          <p className="text-sm text-muted mb-3">{error}</p>
          <Link to="/vic" className="text-xs mono text-invest underline underline-offset-2">
            Browse all credentials
          </Link>
        </div>
      )}

      {vic && !loading && (
        <>
          <VICertificate vic={vic} />
          <p className="text-center text-[10px] mono text-muted mt-8">
            This credential is independently verifiable on Sui testnet.
            Anyone with this link can view it — no login required.
          </p>
        </>
      )}
    </div>
  );
}
