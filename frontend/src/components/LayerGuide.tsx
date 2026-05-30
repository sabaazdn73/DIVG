import { useState, ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { HelpCircle, ChevronDown, ArrowRight } from 'lucide-react';

// ════════════════════════════════════════════════════════════════
//  LayerGuide — collapsible "How this works" panel for each layer.
//  Closed by default; click the header to expand.
// ════════════════════════════════════════════════════════════════

export function LayerGuide({
  color = '#2563EB',
  insert,
  interpret,
}: {
  color?: string;
  insert: ReactNode;     // "How to insert data"
  interpret: ReactNode;  // "How to interpret"
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="card mb-6 overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-5 py-3 hover:bg-panel transition-colors"
      >
        <span className="flex items-center gap-2 text-sm font-medium">
          <HelpCircle className="w-4 h-4" style={{ color }} />
          How this layer works
        </span>
        <ChevronDown className={`w-4 h-4 text-muted transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="px-5 pb-5 pt-1 border-t border-border grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <div className="text-[9px] mono uppercase tracking-wide text-muted mb-2">How to insert data</div>
            <div className="text-xs text-muted leading-relaxed space-y-1.5">{insert}</div>
          </div>
          <div>
            <div className="text-[9px] mono uppercase tracking-wide text-muted mb-2">How to read the results</div>
            <div className="text-xs text-muted leading-relaxed space-y-1.5">{interpret}</div>
          </div>
          <div className="md:col-span-2 pt-1">
            <Link to="/walkthrough"
              className="inline-flex items-center gap-1 text-xs mono font-medium hover:gap-2 transition-all"
              style={{ color }}>
              See the full guided demo <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
//  Tip — small (?) tooltip next to a number or label.
//  Hover (desktop) or tap (mobile) to reveal the explanation.
// ════════════════════════════════════════════════════════════════

export function Tip({ text }: { text: string }) {
  const [show, setShow] = useState(false);
  return (
    <span className="relative inline-flex items-center">
      <button
        type="button"
        onClick={() => setShow(s => !s)}
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
        className="ml-1 text-muted hover:text-ink transition-colors align-middle"
        aria-label="explanation"
      >
        <HelpCircle className="w-3 h-3" />
      </button>
      {show && (
        <span className="absolute left-1/2 -translate-x-1/2 bottom-full mb-1.5 z-50 w-56
                         bg-ink text-white text-[11px] leading-relaxed rounded-md px-3 py-2
                         shadow-lg pointer-events-none normal-case font-sans tracking-normal">
          {text}
          <span className="absolute left-1/2 -translate-x-1/2 top-full w-2 h-2 bg-ink rotate-45 -mt-1" />
        </span>
      )}
    </span>
  );
}
