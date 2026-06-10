import { Link, useLocation, useSearchParams } from 'react-router-dom';
import { ArrowRight, ArrowLeft } from 'lucide-react';

export default function PortalNavigation() {
  const { pathname } = useLocation();
  const [searchParams] = useSearchParams();
  const portalRole = searchParams.get('portal'); // reads '?portal=firm' or '?portal=validator'

  // If they aren't in the B2B portal flow, don't show the navigation bar
  if (!portalRole) return null;

  // Define the non-sequential paths for each role
  const flows = {
    firm: [
      { path: '/registry', label: 'Layer 01: Identity' },
      { path: '/claim',    label: 'Layer 02: Claim Submission' },
      { path: '/vic',      label: 'Layer 05: Export Credential' }
    ],
    validator: [
      { path: '/registry', label: 'Layer 01: Identity' },
      { path: '/round',    label: 'Layer 03: Validation Topology' },
      { path: '/voting',   label: 'Layer 04: Live Voting' }
    ]
  };

  const currentFlow = flows[portalRole as keyof typeof flows];
  if (!currentFlow) return null;

  const currentIndex = currentFlow.findIndex(step => step.path === pathname);
  const nextStep = currentFlow[currentIndex + 1];
  const prevStep = currentFlow[currentIndex - 1];

  return (
    <div className="mt-8 border-t border-white/10 pt-6 flex items-center justify-between">
      {/* BACK BUTTON */}
      {prevStep ? (
        <Link to={`${prevStep.path}?portal=${portalRole}`} className="btn bg-white/5 hover:bg-white/10 text-gray-400 flex items-center gap-2 px-4 py-2 rounded-md transition-colors text-sm">
          <ArrowLeft className="w-4 h-4" /> Back to {prevStep.label}
        </Link>
      ) : (
        <Link to="/portal" className="btn bg-white/5 hover:bg-white/10 text-gray-400 flex items-center gap-2 px-4 py-2 rounded-md transition-colors text-sm">
          <ArrowLeft className="w-4 h-4" /> Exit to B2B Hub
        </Link>
      )}

      {/* NEXT BUTTON */}
      {nextStep ? (
        <Link to={`${nextStep.path}?portal=${portalRole}`} className="btn bg-teal-500 hover:bg-teal-400 text-black font-bold flex items-center gap-2 px-6 py-2 rounded-md transition-all shadow-[0_0_15px_rgba(45,212,191,0.2)]">
          Continue to {nextStep.label} <ArrowRight className="w-4 h-4" />
        </Link>
      ) : (
        <Link to="/portal" className="btn bg-purple-600 hover:bg-purple-500 text-white font-bold flex items-center gap-2 px-6 py-2 rounded-md transition-all shadow-[0_0_15px_rgba(147,51,234,0.3)]">
          Finish & Return to Hub <ArrowRight className="w-4 h-4" />
        </Link>
      )}
    </div>
  );
}