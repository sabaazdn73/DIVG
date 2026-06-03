import { useState } from 'react';
import './VICertificate.css';

// ════════════════════════════════════════════════════════════════
//  VICertificate — shareable Verifiable Impact Credential card.
//  Two ways to verify on Sui:
//   (1) Copy the Sui object/digest to check on the explorer manually
//   (2) "Verify on Sui" button → opens Suiscan testnet directly
//  Hedera anchor is shown as the independent audit trail.
// ════════════════════════════════════════════════════════════════

export default function VICertificate({ vic }: any) {
  const [copied, setCopied] = useState(false);
  if (!vic) return null;

  const issueDate = vic.minted_at
    ? new Date(vic.minted_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase()
    : '—';

  const conf = typeof vic.confidence === 'number' ? vic.confidence.toFixed(3) : '—';
  const decision = vic.d_final === 1 ? 'CONSENSUS' : 'CONTESTED';
  const approvalPct = (vic.total_validators
    ? Math.round((vic.validators_approved / vic.total_validators) * 100)
    : 0) + '%';

  const suiId = vic.sui_digest || '';
  const isReal = suiId && !suiId.startsWith('sim-') && !suiId.toLowerCase().includes('sim');
  const suiscanUrl = isReal ? `https://suiscan.xyz/testnet/tx/${suiId}` : null;

  const copyId = async () => {
    try {
      await navigator.clipboard.writeText(suiId);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch { /* clipboard blocked */ }
  };

  const firmShort = vic.firm_did
    ? (vic.firm_did.length > 22 ? vic.firm_did.slice(0, 10) + '…' + vic.firm_did.slice(-6) : vic.firm_did)
    : 'Registered Firm';

  return (
    <div className="vic-wrapper">
      <div className="vic-card">

        {/* DEMO BANNER */}
        <div className="vic-demo-banner">DEMO VERSION · SUI TESTNET · NOT FOR OFFICIAL USE</div>

        {/* WATERMARK */}
        <div className="vic-watermark">DEMO</div>

        {/* TOP */}
        <div className="vic-top">
          <div className="vic-brand-row">
            <div className="vic-logo">D</div>
            <div>
              <div className="vic-brand-name">DIVG</div>
              <div className="vic-brand-tagline">Verifiable Impact Credential · Sui Testnet</div>
            </div>
          </div>
          <div className="vic-title">Verifiable Impact Credential</div>
          <div className="vic-headline">
            Impact Validation<br />
            <strong>Credential of Record</strong>
          </div>
        </div>

        <div className="vic-divider" />

        {/* BODY */}
        <div className="vic-body">

          {/* Firm / claim */}
          <div className="vic-claim-block">
            <div className="vic-certifies">This credential records the validation of</div>
            <div className="vic-firm-name">{firmShort}</div>
            <div className="vic-claim-id-row">
              <span>Claim · {vic.claim_id ? String(vic.claim_id).slice(0, 12) + '…' : 'verified'}</span>
              <div className="vic-dot" />
              <span>Issued · {issueDate}</span>
            </div>
          </div>

          {/* Consensus result band */}
          <div className="vic-result-band">
            <div className="vic-result-cell">
              <div className="rc-label">Decision</div>
              <div className="rc-value" style={{ color: vic.d_final === 1 ? '#16A34A' : '#D97706' }}>{decision}</div>
              <div className="rc-sub">D_final = {vic.d_final}</div>
            </div>
            <div className="vic-result-cell">
              <div className="rc-label">Confidence</div>
              <div className="rc-value">{conf}</div>
              <div className="rc-sub">Conf(c)</div>
            </div>
            <div className="vic-result-cell">
              <div className="rc-label">Panel approval</div>
              <div className="rc-value">{approvalPct}</div>
              <div className="rc-sub">{vic.validators_approved}/{vic.total_validators} validators</div>
            </div>
          </div>

          {/* Data fields */}
          <div className="vic-grid">
            <div className="vic-field">
              <div className="vic-field-label">Credential Type</div>
              <div className="vic-field-value">Verifiable Impact Credential (VIC)</div>
            </div>
            <div className="vic-field">
              <div className="vic-field-label">Aggregate Sentiment</div>
              <div className="vic-field-value">{typeof vic.s_agg === 'number' ? vic.s_agg.toFixed(3) : '—'}</div>
            </div>
            <div className="vic-field full">
              <div className="vic-field-label">Sui Object / Transaction (Testnet)</div>
              <div className="vic-field-value mono">{suiId || 'simulated — run on testnet to anchor'}</div>
            </div>
            {vic.walrus_blob_id && (
              <div className="vic-field full">
                <div className="vic-field-label">Walrus Blob (decentralized storage)</div>
                <div className="vic-field-value mono">{vic.walrus_blob_id}</div>
              </div>
            )}
          </div>

          {/* ── VERIFICATION GRAPH ── */}
          <VerificationGraph vic={vic} firmShort={firmShort} />

          {/* Verify actions */}
          <div className="vic-verify-row">
            <button className="vic-btn vic-btn-copy" onClick={copyId} disabled={!suiId}>
              {copied ? '✓ Copied' : 'Copy Sui ID'}
            </button>
            {suiscanUrl ? (
              <a className="vic-btn vic-btn-verify" href={suiscanUrl} target="_blank" rel="noopener noreferrer">
                Verify on Sui Explorer →
              </a>
            ) : (
              <button className="vic-btn vic-btn-verify" style={{ opacity: 0.5, cursor: 'not-allowed' }} disabled>
                Verify on Sui (run on testnet)
              </button>
            )}
            {vic.walrus_blob_id && (
              <a className="vic-btn vic-btn-verify" href={`https://aggregator.walrus-testnet.walrus.space/v1/blobs/${vic.walrus_blob_id}`} target="_blank" rel="noopener noreferrer">
                Verify on Walrus →
              </a>
            )}
          </div>

        </div>

        {/* FOOTER */}
        <div className="vic-footer">
          <div className="vic-footer-left">
            <div className="vic-chain-badge">Sui · MoveVM</div>
            <div className="vic-footer-divider" />
            <div className="vic-footer-net">
              {vic.hedera_topic_id && !String(vic.hedera_topic_id).includes('SIM')
                ? `Hedera audit · topic ${vic.hedera_topic_id}`
                : 'Hedera audit · pending'}
            </div>
          </div>
          <div className="vic-footer-right">
            <div className="vic-footer-date">Minted · {issueDate}</div>
            <div className="vic-footer-tx">verify at suiscan.xyz/testnet</div>
          </div>
        </div>

      </div>
      <div className="vic-export-note">divg · anchored on Sui testnet · independently verifiable</div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
//  VerificationGraph — bubble map: firm → claim → validators (ring,
//  coloured by group) → VIC → investor σ. Plus a pseudonymous DID list.
//  Participants are shown by DID only (no names). Firm is revealed.
// ════════════════════════════════════════════════════════════════

const GROUP_COLOR: Record<string, string> = {
  employee:    '#2563EB',
  expert:      '#16A34A',
  beneficiary: '#D97706',
  firm:        '#7C3AED',
  investor:    '#4F46E5',
};

function shortDid(did: string) {
  if (!did) return 'did:…';
  const s = String(did);
  return s.length > 16 ? s.slice(0, 10) + '…' + s.slice(-4) : s;
}

function VerificationGraph({ vic, firmShort }: any) {
  const validators: { did: string; group: string; vote: number }[] = vic.graph_validators || [];
  const sigmas: { sigma: number; theta: number }[] = vic.graph_sigmas || [];

  if (!validators.length) {
    return (
      <div className="vic-graph-empty">
        Verification graph is recorded when a validation round runs on testnet.
        This credential was minted without a stored panel (simulated/legacy).
      </div>
    );
  }

  // ring geometry
  const W = 560, H = 360, cx = W / 2, cy = 178, R = 118;
  const n = validators.length;
  const nodes = validators.map((v, i) => {
    const ang = (i / n) * Math.PI * 2 - Math.PI / 2;
    return { ...v, x: cx + R * Math.cos(ang), y: cy + R * Math.sin(ang) };
  });

  const anyProceed = sigmas.some(s => s.sigma === 1);
  const sigmaColor = sigmas.length === 0 ? '#9CA3AF' : (anyProceed ? '#16A34A' : '#D97706');
  const sigmaLabel = sigmas.length === 0 ? 'σ pending' : (anyProceed ? 'σ = PROCEED' : 'σ = CAUTION');

  return (
    <div className="vic-graph">
      <div className="vic-graph-title">Verification Graph</div>

      <svg viewBox={`0 0 ${W} ${H}`} width="100%" className="vic-graph-svg">
        {/* edges firm→claim center */}
        <line x1={cx} y1={26} x2={cx} y2={cy - 26} stroke="#C084FC" strokeWidth="1.5" opacity="0.6" />
        {/* edges claim→validators */}
        {nodes.map((nd, i) => (
          <line key={'e' + i} x1={cx} y1={cy} x2={nd.x} y2={nd.y}
            stroke={GROUP_COLOR[nd.group] || '#999'} strokeWidth="1" opacity="0.35" />
        ))}
        {/* edge claim→VIC→investor (down) */}
        <line x1={cx} y1={cy + 26} x2={cx} y2={H - 58} stroke="#7C3AED" strokeWidth="1.5" opacity="0.5" />

        {/* FIRM node (revealed) */}
        <g>
          <rect x={cx - 70} y={8} width={140} height={34} rx={8} fill="#7C3AED" />
          <text x={cx} y={29} textAnchor="middle" fontSize="12" fontWeight="700" fill="#fff" fontFamily="system-ui">{firmShort}</text>
          <text x={cx} y={54} textAnchor="middle" fontSize="8" fill="#6B6B7A" fontFamily="monospace">FIRM · ISSUER (revealed)</text>
        </g>

        {/* CLAIM center */}
        <circle cx={cx} cy={cy} r={26} fill="#160F3A" />
        <text x={cx} y={cy - 1} textAnchor="middle" fontSize="9" fill="#C084FC" fontFamily="monospace">CLAIM</text>
        <text x={cx} y={cy + 10} textAnchor="middle" fontSize="7" fill="#9FB2D4" fontFamily="monospace">hashed</text>

        {/* validator bubbles */}
        {nodes.map((nd, i) => (
          <g key={'n' + i}>
            <circle cx={nd.x} cy={nd.y} r={11}
              fill={GROUP_COLOR[nd.group] || '#999'}
              opacity={nd.vote === 1 ? 0.95 : 0.4}
              stroke={nd.vote === 1 ? '#fff' : '#E5E7EB'} strokeWidth="1.5" />
            <text x={nd.x} y={nd.y + 3} textAnchor="middle" fontSize="9" fill="#fff" fontWeight="700">
              {nd.vote === 1 ? '✓' : '·'}
            </text>
          </g>
        ))}

        {/* VIC + investor σ at bottom */}
        <g>
          <rect x={cx - 64} y={H - 52} width={128} height={32} rx={8} fill={sigmaColor} />
          <text x={cx} y={H - 31} textAnchor="middle" fontSize="11" fontWeight="700" fill="#fff" fontFamily="monospace">{sigmaLabel}</text>
          <text x={cx} y={H - 6} textAnchor="middle" fontSize="8" fill="#6B6B7A" fontFamily="monospace">
            INVESTOR ADVISORY · {sigmas.length} quer{sigmas.length === 1 ? 'y' : 'ies'} (pseudonymous)
          </text>
        </g>
      </svg>

      {/* group legend */}
      <div className="vic-graph-legend">
        <span><i style={{ background: GROUP_COLOR.employee }} /> Employee</span>
        <span><i style={{ background: GROUP_COLOR.expert }} /> Expert</span>
        <span><i style={{ background: GROUP_COLOR.beneficiary }} /> Beneficiary</span>
        <span className="vic-legend-note">filled = approved · faded = rejected</span>
      </div>

      {/* pseudonymous DID list */}
      <div className="vic-did-title">Participating Validators · by DID (names hidden)</div>
      <div className="vic-did-list">
        {validators.map((v, i) => (
          <div className="vic-did-row" key={'d' + i}>
            <span className="vic-did-dot" style={{ background: GROUP_COLOR[v.group] || '#999' }} />
            <span className="vic-did-hash">{shortDid(v.did)}</span>
            <span className="vic-did-group">{v.group}</span>
            <span className="vic-did-vote" style={{ color: v.vote === 1 ? '#16A34A' : '#9CA3AF' }}>
              {v.vote === 1 ? 'approved' : 'rejected'}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}