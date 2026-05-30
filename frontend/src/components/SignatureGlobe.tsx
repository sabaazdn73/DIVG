import { useRef, useEffect, useMemo } from 'react';
import Globe, { type GlobeMethods } from 'react-globe.gl';

// ════════════════════════════════════════════════════════════════
//  SignatureGlobe — Saba Azadegan's personal signature element.
//  Reused across projects (TrustCycle → DIVG) as a recognisable mark.
//
//  DIVG variant: tuned for the light Sui Overflow theme.
//  - low opacity so it sits behind content without fighting the UI
//  - arcs use DIVG layer colours (teal / blue / purple / emerald)
//  - slow auto-rotation, no zoom, pointer-events disabled
// ════════════════════════════════════════════════════════════════

interface SignatureGlobeProps {
  opacity?: number;       // 0–1, default 0.35
  rightOffset?: string;   // horizontal placement, default '40%'
}

export default function SignatureGlobe({
  opacity = 0.35,
  rightOffset = '40%',
}: SignatureGlobeProps) {
  const globeEl = useRef<GlobeMethods | undefined>(undefined);
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

  // arcs in DIVG's palette instead of TrustCycle purple
  const arcsData = useMemo(
    () =>
      [...Array(22).keys()].map(() => ({
        startLat: (Math.random() - 0.5) * 180,
        startLng: (Math.random() - 0.5) * 360,
        endLat: (Math.random() - 0.5) * 180,
        endLng: (Math.random() - 0.5) * 360,
        // DIVG layer colours: teal, sapphire, vic-purple, hedera-emerald
        color: ['#0F6E56', '#2563EB', '#7C3AED', '#16A34A'][Math.floor(Math.random() * 4)],
      })),
    []
  );

  useEffect(() => {
    if (globeEl.current) {
      globeEl.current.pointOfView({ lat: 25, lng: 40, altitude: 2.0 });
      const controls = globeEl.current.controls();
      controls.autoRotate = true;
      controls.autoRotateSpeed = 0.4;
      controls.enableZoom = false;
    }
  }, []);

  return (
    <div
      aria-hidden
      style={{
        position: 'fixed',
        top: 0,
        left: isMobile ? 0 : rightOffset,
        width: isMobile ? '100vw' : '100%',
        height: '100%',
        zIndex: 0,
        opacity,
        pointerEvents: 'none',
        // soft fade so the globe melts into the white background at edges
        maskImage: 'radial-gradient(circle at center, black 55%, transparent 80%)',
        WebkitMaskImage: 'radial-gradient(circle at center, black 55%, transparent 80%)',
      }}
    >
      <Globe
        ref={globeEl}
        // light-theme globe: blue marble day texture instead of earth-night
        globeImageUrl="//unpkg.com/three-globe/example/img/earth-blue-marble.jpg"
        bumpImageUrl="//unpkg.com/three-globe/example/img/earth-topology.png"
        backgroundColor="rgba(0,0,0,0)"
        width={typeof window !== 'undefined' ? window.innerWidth : 1200}
        height={typeof window !== 'undefined' ? window.innerHeight : 800}
        showAtmosphere={true}
        atmosphereColor="#7C3AED"
        atmosphereAltitude={0.18}
        arcsData={arcsData}
        arcColor="color"
        arcDashLength={0.5}
        arcDashGap={2}
        arcDashAnimateTime={2200}
        arcStroke={0.35}
      />
    </div>
  );
}
