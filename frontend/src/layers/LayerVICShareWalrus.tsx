import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { apiVicFromWalrus, VIC } from '../lib/api';
import VICertificate from '../components/VICertificate';

// ════════════════════════════════════════════════════════════════
//  LayerVICShareWalrus — full-page shareable credential, read from
//  WALRUS (not server memory). Survives backend restarts, because
//  the credential lives on decentralized storage.
//  Route: /vic/walrus/:blobId
// ════════════════════════════════════════════════════════════════

export default function LayerVICShareWalrus() {
  const { blobId } = useParams();
  const [vic, setVic]      = useState<VIC | null>(null);
  const [loading, setLoad] = useState(true);
  const [error, setError]  = useState<string | null>(null);

  useEffect(() => {
    if (!blobId) { setError('No Walrus blob id provided.'); setLoad(false); return; }
    apiVicFromWalrus(blobId)
      .then((v) => { setVic(v); setLoad(false); })
      .catch(() => { setError('Credential not found on Walrus. The blob may have expired.'); setLoad(false); });
  }, [blobId]);

  const aggregatorUrl = blobId
    ? `https://aggregator.walrus-testnet.walrus.space/v1/blobs/${blobId}`
    : null;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-14">
      <div className="mb-6 flex items-center justify-between">
        <Link to="/vic" className="text-xs mono text-muted hover:text-ink transition-colors">
          ← All credentials
        </Link>
        <span className="text-[10px] mono text-muted">DIVG · Verified via Walrus</span>
      </div>

      {loading && (
        <div className="card p-6 sm:p-12 text-center text-sm text-muted mono">
          Retrieving credential from Walrus…
        </div>
      )}

      {error && !loading && (
        <div className="card p-6 sm:p-12 text-center">
          <p className="text-sm text-muted mb-3">{error}</p>
          <Link to="/vic" className="text-xs mono text-invest underline underline-offset-2">
            Browse all credentials
          </Link>
        </div>
      )}

      {vic && !loading && (
        <>
          <VICertificate vic={vic} />
          <div className="text-center mt-8 space-y-2">
            <p className="text-[10px] mono text-muted">
              This credential was retrieved from Walrus decentralized storage —
              independent of any server. Anyone with this link can verify it.
            </p>
            {aggregatorUrl && (
              <a
                href={aggregatorUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[10px] mono text-invest underline underline-offset-2 break-all"
              >
                View raw blob on Walrus →
              </a>
            )}
          </div>
        </>
      )}
    </div>
  );
}
