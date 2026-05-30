import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';

// ════════════════════════════════════════════════════════════════
//  DIVGScene — reusable Three.js topology that reacts to live data.
//
//  Scientific shape language (consistent across all layers):
//    • Firm        → hexagonal cylinder (issuer node, structural)
//    • Claim       → octahedron (faceted credential crystal)
//    • Validators  → spheres, sized by reputation, coloured by group
//    • Pool        → small translucent spheres (unselected)
//    • VIC         → icosahedron with halo ring (minted Sui object)
//    • Hedera      → tetrahedron (audit anchor)
//    • Investor    → cone (directional query)
//
//  Colour tokens match the Sui Overflow light theme.
// ════════════════════════════════════════════════════════════════

export type SceneMode =
  | 'overview'
  | 'registry'
  | 'claim'
  | 'round'
  | 'vic'
  | 'investor';

export type SceneValidator = {
  group: 'employee' | 'expert' | 'beneficiary' | string;
  reputation: number;
  vote?: number | null;       // 0 | 1 | null (not yet revealed)
  score?: number | null;
  phase?: 'pool' | 'selected' | 'committed' | 'revealed' | 'scored';
};

export type SceneData = {
  mode: SceneMode;
  validators?: SceneValidator[];
  firmsCount?: number;
  claimsCount?: number;
  vicsCount?: number;
  dFinal?: number | null;
  confidence?: number | null;
  theta?: number | null;        // investor risk threshold
  sigma?: number | null;        // computed advisory result (0|1|null)
  approved?: number | null;     // validators approved
  total?: number | null;        // total validators
  firmName?: string;
  // round animation phase
  roundPhase?: 'idle' | 'select' | 'commit' | 'reveal' | 'score' | 'done';
};

const COLORS = {
  firm:   0x0891b2,
  claim:  0x0284c7,
  val:    0x2563eb,
  emp:    0x2563eb,
  exp:    0x16a34a,
  ben:    0xeab308,
  pool:   0x94a3b8,
  vic:    0x7c3aed,
  hedera: 0x16a34a,
  invest: 0x4f46e5,
  edge:   0xcbd5e1,
};

function groupColor(g: string): number {
  if (g === 'employee') return COLORS.emp;
  if (g === 'expert') return COLORS.exp;
  if (g === 'beneficiary') return COLORS.ben;
  return COLORS.val;
}

export default function DIVGScene({ data, height = 420 }: { data: SceneData; height?: number }) {
  const mountRef = useRef<HTMLDivElement>(null);
  const dataRef  = useRef<SceneData>(data);
  dataRef.current = data;

  // Responsive height: on small screens, cap the scene so it doesn't
  // dominate the viewport. Desktop uses the full requested height.
  const [vh, setVh] = useState(height);
  useEffect(() => {
    const compute = () => {
      const w = typeof window !== 'undefined' ? window.innerWidth : 1200;
      if (w < 640) setVh(Math.min(height, 300));        // phones
      else if (w < 1024) setVh(Math.min(height, 420));  // tablets
      else setVh(height);                               // desktop
    };
    compute();
    window.addEventListener('resize', compute);
    return () => window.removeEventListener('resize', compute);
  }, [height]);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const width = mount.clientWidth;
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, vh);
    renderer.setClearColor(0xffffff, 0);
    mount.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(42, width / vh, 0.1, 200);
    camera.position.set(0, 1.5, 13);

    scene.add(new THREE.AmbientLight(0xffffff, 0.85));
    const dir = new THREE.DirectionalLight(0xffffff, 0.7);
    dir.position.set(5, 12, 8);
    scene.add(dir);

    // baseline grid
    const grid = new THREE.GridHelper(20, 20, 0xe2e8f0, 0xf1f5f9);
    grid.position.y = -3.5;
    (grid.material as THREE.Material).opacity = 0.55;
    (grid.material as THREE.Material).transparent = true;
    scene.add(grid);

    const root = new THREE.Group();
    scene.add(root);

    // ── helper builders ──────────────────────────────────────────
    function makeLabelSprite(text: string, color: string) {
      const c = document.createElement('canvas');
      c.width = 256; c.height = 64;
      const ctx = c.getContext('2d')!;
      ctx.fillStyle = '#ffffff';
      ctx.strokeStyle = '#e2e8f0';
      ctx.lineWidth = 2;
      ctx.fillRect(2, 2, 252, 60);
      ctx.strokeRect(2, 2, 252, 60);
      ctx.fillStyle = color;
      ctx.font = 'bold 22px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(text, 128, 34);
      const tex = new THREE.CanvasTexture(c);
      const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false });
      const sp = new THREE.Sprite(mat);
      sp.scale.set(2.0, 0.5, 1);
      return sp;
    }

    function disposeGroup(g: THREE.Group) {
      g.traverse(obj => {
        const m = obj as THREE.Mesh;
        if (m.geometry) m.geometry.dispose();
        if (m.material) {
          if (Array.isArray(m.material)) m.material.forEach(x => x.dispose());
          else (m.material as THREE.Material).dispose();
        }
      });
      g.clear();
    }

    // store dynamic objects for animation
    let validatorMeshes: { mesh: THREE.Mesh; base: THREE.Vector3; v: SceneValidator }[] = [];
    let pulseObjects: THREE.Object3D[] = [];
    let edgeLines: THREE.Line[] = [];

    // ── scene builder, called on data change ─────────────────────
    function build(d: SceneData) {
      disposeGroup(root);
      validatorMeshes = [];
      pulseObjects = [];
      edgeLines = [];

      // central anchor depends on mode
      if (d.mode === 'overview') buildOverview(d);
      else if (d.mode === 'registry') buildRegistry(d);
      else if (d.mode === 'claim') buildClaim(d);
      else if (d.mode === 'round') buildRound(d);
      else if (d.mode === 'vic') buildVIC(d);
      else if (d.mode === 'investor') buildInvestor(d);
    }

    // FIRM node — hexagonal prism
    function firmNode(pos: THREE.Vector3) {
      const geo = new THREE.CylinderGeometry(0.45, 0.45, 0.7, 6);
      const mat = new THREE.MeshPhongMaterial({ color: COLORS.firm, shininess: 40, flatShading: true });
      const m = new THREE.Mesh(geo, mat);
      m.position.copy(pos);
      root.add(m);
      pulseObjects.push(m);
      return m;
    }

    // CLAIM node — octahedron crystal
    function claimNode(pos: THREE.Vector3) {
      const geo = new THREE.OctahedronGeometry(0.5, 0);
      const mat = new THREE.MeshPhongMaterial({ color: COLORS.claim, shininess: 60, flatShading: true });
      const m = new THREE.Mesh(geo, mat);
      m.position.copy(pos);
      root.add(m);
      return m;
    }

    // VIC node — icosahedron with halo
    function vicNode(pos: THREE.Vector3, scale = 1) {
      const geo = new THREE.IcosahedronGeometry(0.5 * scale, 0);
      const mat = new THREE.MeshPhongMaterial({ color: COLORS.vic, shininess: 70, flatShading: true });
      const m = new THREE.Mesh(geo, mat);
      m.position.copy(pos);
      root.add(m);
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(0.8 * scale, 0.02, 8, 48),
        new THREE.MeshBasicMaterial({ color: COLORS.vic, transparent: true, opacity: 0.35 })
      );
      ring.position.copy(pos);
      ring.rotation.x = Math.PI / 2.3;
      root.add(ring);
      pulseObjects.push(ring);
      return m;
    }

    // HEDERA node — tetrahedron
    function hederaNode(pos: THREE.Vector3) {
      const geo = new THREE.TetrahedronGeometry(0.5, 0);
      const mat = new THREE.MeshPhongMaterial({ color: COLORS.hedera, shininess: 50, flatShading: true });
      const m = new THREE.Mesh(geo, mat);
      m.position.copy(pos);
      root.add(m);
      return m;
    }

    // INVESTOR node — cone
    function investorNode(pos: THREE.Vector3) {
      const geo = new THREE.ConeGeometry(0.4, 0.8, 4);
      const mat = new THREE.MeshPhongMaterial({ color: COLORS.invest, shininess: 40, flatShading: true });
      const m = new THREE.Mesh(geo, mat);
      m.position.copy(pos);
      m.rotation.z = Math.PI;
      root.add(m);
      return m;
    }

    function edge(a: THREE.Vector3, b: THREE.Vector3, color = COLORS.edge, opacity = 0.4, dashed = false) {
      const geo = new THREE.BufferGeometry().setFromPoints([a, b]);
      const mat = dashed
        ? new THREE.LineDashedMaterial({ color, transparent: true, opacity, dashSize: 0.18, gapSize: 0.1 })
        : new THREE.LineBasicMaterial({ color, transparent: true, opacity });
      const line = new THREE.Line(geo, mat);
      if (dashed) line.computeLineDistances();
      root.add(line);
      edgeLines.push(line);
      return line;
    }

    // validator sphere — size by reputation, colour by group
    function validatorSphere(v: SceneValidator, pos: THREE.Vector3) {
      const r = 0.12 + (v.reputation ?? 0.5) * 0.18;
      const geo = new THREE.SphereGeometry(r, 20, 20);
      const phase = v.phase ?? 'selected';
      let color = groupColor(v.group);
      let opacity = 1;
      if (phase === 'pool') { color = COLORS.pool; opacity = 0.45; }
      const mat = new THREE.MeshPhongMaterial({ color, shininess: 50, transparent: opacity < 1, opacity });
      const m = new THREE.Mesh(geo, mat);
      m.position.copy(pos);
      root.add(m);
      validatorMeshes.push({ mesh: m, base: pos.clone(), v });
      return m;
    }

    // ── MODE: OVERVIEW — full pipeline topology ──────────────────
    function buildOverview(d: SceneData) {
      const firm = firmNode(new THREE.Vector3(-5, 0.5, 0));
      root.add(makeLabelSprite('Firm', '#0891b2').translateX(-5).translateY(1.6).translateZ(0));
      const claim = claimNode(new THREE.Vector3(-2.5, 0.5, 0));
      root.add(makeLabelSprite('Claim', '#0284c7').translateX(-2.5).translateY(1.6));
      edge(new THREE.Vector3(-5, 0.5, 0), new THREE.Vector3(-2.5, 0.5, 0), COLORS.firm, 0.6);

      // validator cluster
      const clusterCenter = new THREE.Vector3(0.4, 0.8, 0);
      const groups = ['employee', 'expert', 'beneficiary'];
      for (let i = 0; i < 12; i++) {
        const ang = (i / 12) * Math.PI * 2;
        const pos = new THREE.Vector3(
          clusterCenter.x + Math.cos(ang) * 0.9,
          clusterCenter.y + Math.sin(ang) * 0.7,
          clusterCenter.z + (Math.random() - 0.5) * 0.4
        );
        validatorSphere({ group: groups[i % 3], reputation: 0.5, phase: 'selected' }, pos);
        edge(new THREE.Vector3(-2.5, 0.5, 0), pos, COLORS.claim, 0.12, true);
      }
      root.add(makeLabelSprite('Validators', '#2563eb').translateX(0.4).translateY(2.2));

      const vic = vicNode(new THREE.Vector3(3.4, 0.3, 0));
      root.add(makeLabelSprite('VIC', '#7c3aed').translateX(3.4).translateY(1.6));
      validatorMeshes.forEach(vm => edge(vm.base, new THREE.Vector3(3.4, 0.3, 0), COLORS.val, 0.18));

      const hedera = hederaNode(new THREE.Vector3(3.4, -1.6, 0));
      root.add(makeLabelSprite('Hedera', '#16a34a').translateX(3.4).translateY(-0.8));
      edge(new THREE.Vector3(3.4, 0.3, 0), new THREE.Vector3(3.4, -1.6, 0), COLORS.hedera, 0.5, true);

      const inv = investorNode(new THREE.Vector3(5.8, 0.3, 0));
      root.add(makeLabelSprite('Investor', '#4f46e5').translateX(5.8).translateY(1.6));
      edge(new THREE.Vector3(5.8, 0.3, 0), new THREE.Vector3(3.4, 0.3, 0), COLORS.invest, 0.6);
    }

    // ── MODE: REGISTRY — validators populate a pool sphere ───────
    function buildRegistry(d: SceneData) {
      const vals = d.validators ?? [];
      root.add(makeLabelSprite(`Pool · ${vals.length}`, '#64748b').translateY(2.6));
      const n = Math.max(vals.length, 1);
      vals.forEach((v, i) => {
        // distribute on a sphere (Fibonacci)
        const phi = Math.acos(1 - 2 * (i + 0.5) / n);
        const theta = Math.PI * (1 + Math.sqrt(5)) * (i + 0.5);
        const R = 2.6;
        const pos = new THREE.Vector3(
          R * Math.sin(phi) * Math.cos(theta),
          R * Math.cos(phi) * 0.7,
          R * Math.sin(phi) * Math.sin(theta)
        );
        validatorSphere({ ...v, phase: 'selected' }, pos);
      });
      if (vals.length === 0) {
        // empty-state hint cube
        const m = new THREE.Mesh(
          new THREE.SphereGeometry(0.3, 16, 16),
          new THREE.MeshPhongMaterial({ color: COLORS.pool, transparent: true, opacity: 0.3 })
        );
        root.add(m);
      }
    }

    // ── MODE: CLAIM — firm emits claim crystals ──────────────────
    function buildClaim(d: SceneData) {
      const firm = firmNode(new THREE.Vector3(-3.5, 0, 0));
      root.add(makeLabelSprite('Firm', '#0891b2').translateX(-3.5).translateY(1.4));
      const count = Math.min(d.claimsCount ?? 0, 12);
      for (let i = 0; i < Math.max(count, 1); i++) {
        const ang = (i / Math.max(count, 1)) * Math.PI * 1.4 - 0.7;
        const pos = new THREE.Vector3(0.5 + Math.cos(ang) * 2.2, Math.sin(ang) * 1.8, 0);
        const c = claimNode(pos);
        c.scale.setScalar(count === 0 ? 0.5 : 1);
        if (count === 0) (c.material as THREE.MeshPhongMaterial).opacity = 0.3,
                         ((c.material as THREE.MeshPhongMaterial).transparent = true);
        edge(new THREE.Vector3(-3.5, 0, 0), pos, COLORS.firm, 0.4, true);
      }
      root.add(makeLabelSprite(`Claims · ${d.claimsCount ?? 0}`, '#0284c7').translateX(1).translateY(2.4));
    }

    // ── MODE: ROUND — VRF draw → commit → reveal → score ─────────
    function buildRound(d: SceneData) {
      const vals = d.validators ?? [];
      const claim = claimNode(new THREE.Vector3(0, 2.2, 0));
      root.add(makeLabelSprite('Claim', '#0284c7').translateY(3.2));

      const n = Math.max(vals.length, 1);
      // three group arcs
      vals.forEach((v, i) => {
        const groupIdx = v.group === 'employee' ? 0 : v.group === 'expert' ? 1 : 2;
        const inGroup = vals.filter(x => x.group === v.group);
        const localIdx = inGroup.indexOf(v);
        const arcSpan = Math.PI * 0.5;
        const baseAng = -Math.PI / 2 + (groupIdx - 1) * arcSpan;
        const ang = baseAng + (localIdx / Math.max(inGroup.length, 1)) * arcSpan - arcSpan / 2;
        const R = 3.2;
        const pos = new THREE.Vector3(Math.cos(ang) * R, Math.sin(ang) * R * 0.55 - 0.3, (Math.random() - 0.5) * 0.5);
        validatorSphere(v, pos);
        // edge from claim to validator if committed/revealed
        if (v.phase === 'revealed' || v.phase === 'scored') {
          const col = v.vote === 1 ? COLORS.hedera : 0xf59e0b;
          edge(new THREE.Vector3(0, 2.2, 0), pos, col, 0.4);
        } else if (v.phase === 'committed') {
          edge(new THREE.Vector3(0, 2.2, 0), pos, COLORS.edge, 0.2, true);
        }
      });
    }

    // ── MODE: VIC — minted credential with dual-chain anchors ────
    function buildVIC(d: SceneData) {
      const conf = d.confidence ?? 0.5;
      const vic = vicNode(new THREE.Vector3(0, 0.5, 0), 0.8 + conf * 0.6);
      root.add(makeLabelSprite(`VIC · ${(conf * 100).toFixed(0)}%`, '#7c3aed').translateY(2.2));
      const hedera = hederaNode(new THREE.Vector3(-2.8, -1.2, 0));
      root.add(makeLabelSprite('Hedera', '#16a34a').translateX(-2.8).translateY(-0.3));
      const sui = new THREE.Mesh(
        new THREE.BoxGeometry(0.7, 0.7, 0.7),
        new THREE.MeshPhongMaterial({ color: COLORS.vic, shininess: 60, flatShading: true })
      );
      sui.position.set(2.8, -1.2, 0);
      root.add(sui);
      pulseObjects.push(sui);
      root.add(makeLabelSprite('SUI', '#7c3aed').translateX(2.8).translateY(-0.3));
      edge(new THREE.Vector3(0, 0.5, 0), new THREE.Vector3(-2.8, -1.2, 0), COLORS.hedera, 0.5, true);
      edge(new THREE.Vector3(0, 0.5, 0), new THREE.Vector3(2.8, -1.2, 0), COLORS.vic, 0.5);
      // count halo of small VICs
      const count = Math.min(d.vicsCount ?? 0, 16);
      for (let i = 0; i < count; i++) {
        const ang = (i / count) * Math.PI * 2;
        const m = new THREE.Mesh(
          new THREE.IcosahedronGeometry(0.1, 0),
          new THREE.MeshPhongMaterial({ color: COLORS.vic, transparent: true, opacity: 0.4 })
        );
        m.position.set(Math.cos(ang) * 4.2, 0.5 + Math.sin(ang) * 1.5, Math.sin(ang) * 1.5 - 1);
        root.add(m);
      }
    }

    // ── MODE: INVESTOR — query beam to VIC ───────────────────────
    function buildInvestor(d: SceneData) {
      // Full verification graph: firm -> claim -> validators -> VIC -> Hedera,
      // with the investor querying the VIC and the sigma result revealed.
      const conf = d.confidence ?? 0.5;
      const theta = d.theta ?? 0.7;
      // sigma: prefer explicitly-computed value, else derive
      const sigma = d.sigma != null ? d.sigma
                    : (d.dFinal === 1 && conf >= theta ? 1 : 0);
      const sigmaColor = sigma === 1 ? COLORS.hedera : 0xf59e0b;

      // node positions across the graph
      const pFirm   = new THREE.Vector3(-5.5, 1.2, 0);
      const pClaim  = new THREE.Vector3(-3.2, 1.2, 0);
      const pPanel  = new THREE.Vector3(-0.6, 1.6, 0);
      const pVIC    = new THREE.Vector3(1.8, 0.2, 0);
      const pHedera = new THREE.Vector3(1.8, -1.9, 0);
      const pInv    = new THREE.Vector3(5.2, 0.2, 0);

      // firm -> claim
      firmNode(pFirm);
      root.add(makeLabelSprite('Firm', '#0891b2').translateX(pFirm.x).translateY(pFirm.y + 1.0));
      claimNode(pClaim);
      root.add(makeLabelSprite('Claim', '#0284c7').translateX(pClaim.x).translateY(pClaim.y + 1.0));
      edge(pFirm, pClaim, COLORS.firm, 0.6);

      // validator cluster (coloured by group), edges claim -> validators -> VIC
      const groups = ['employee', 'expert', 'beneficiary'];
      const approved = d.approved ?? 0;
      const total = d.total ?? 12;
      const shown = Math.min(total || 12, 12);
      for (let i = 0; i < shown; i++) {
        const ang = (i / shown) * Math.PI * 2;
        const pos = new THREE.Vector3(
          pPanel.x + Math.cos(ang) * 0.95,
          pPanel.y + Math.sin(ang) * 0.75,
          pPanel.z + (Math.random() - 0.5) * 0.3
        );
        // colour: approved share -> green, else amber (reject)
        const isApprove = i < Math.round((approved / (total || 1)) * shown);
        validatorSphere({
          group: groups[i % 3], reputation: 0.5,
          vote: isApprove ? 1 : 0, phase: 'scored',
        }, pos);
        edge(pClaim, pos, COLORS.claim, 0.12, true);
        edge(pos, pVIC, COLORS.val, 0.18);
      }
      root.add(makeLabelSprite('Validators', '#2563eb').translateX(pPanel.x).translateY(pPanel.y + 1.5));

      // VIC, sized by confidence
      vicNode(pVIC, 0.8 + conf * 0.6);
      root.add(makeLabelSprite(`VIC ${(conf * 100).toFixed(0)}%`, '#7c3aed').translateX(pVIC.x).translateY(pVIC.y + 1.3));

      // Hedera audit anchor under the VIC
      hederaNode(pHedera);
      root.add(makeLabelSprite('Hedera', '#16a34a').translateX(pHedera.x).translateY(pHedera.y + 0.9));
      edge(pVIC, pHedera, COLORS.hedera, 0.5, true);

      // investor cone querying the VIC
      investorNode(pInv);
      root.add(makeLabelSprite('Investor', '#4f46e5').translateX(pInv.x).translateY(pInv.y + 1.3));
      // dual-path query: investor reads both VIC and Hedera
      edge(pInv, pVIC, COLORS.invest, 0.7);
      edge(pInv, pHedera, COLORS.invest, 0.3, true);

      // sigma result orb on the investor->VIC beam, coloured by PROCEED/CAUTION
      const ind = new THREE.Mesh(
        new THREE.SphereGeometry(0.28, 20, 20),
        new THREE.MeshPhongMaterial({ color: sigmaColor, shininess: 70 })
      );
      ind.position.copy(pVIC.clone().lerp(pInv, 0.5));
      root.add(ind);
      pulseObjects.push(ind);
      root.add(makeLabelSprite(sigma === 1 ? 'sigma=1 PROCEED' : 'sigma=0 CAUTION',
        sigma === 1 ? '#16a34a' : '#d97706')
        .translateX(ind.position.x).translateY(ind.position.y - 0.9));
    }

    build(data);

    // ── interaction: drag to rotate ──────────────────────────────
    let dragging = false, px = 0, py = 0;
    let rotY = -0.1, rotX = 0.05, autoRotate = true;

    // ── mouse (desktop) ──
    const onDown = (e: MouseEvent) => { dragging = true; autoRotate = false; px = e.clientX; py = e.clientY; };
    const onUp = () => { dragging = false; };
    const onMove = (e: MouseEvent) => {
      if (!dragging) return;
      rotY += (e.clientX - px) * 0.006;
      rotX += (e.clientY - py) * 0.006;
      rotX = Math.max(-0.6, Math.min(0.6, rotX));
      px = e.clientX; py = e.clientY;
    };
    renderer.domElement.addEventListener('mousedown', onDown);
    window.addEventListener('mouseup', onUp);
    window.addEventListener('mousemove', onMove);

    // ── touch (mobile) ──
    // One finger rotates the scene. We only start rotating (and block page
    // scroll) once the gesture is clearly horizontal, so vertical scrolling
    // past the canvas still works.
    let touching = false, tStartX = 0, tStartY = 0, tLastX = 0, tLastY = 0, gestureLocked = false;
    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length !== 1) return;
      touching = true; gestureLocked = false; autoRotate = false;
      tStartX = tLastX = e.touches[0].clientX;
      tStartY = tLastY = e.touches[0].clientY;
    };
    const onTouchMove = (e: TouchEvent) => {
      if (!touching || e.touches.length !== 1) return;
      const x = e.touches[0].clientX, y = e.touches[0].clientY;
      if (!gestureLocked) {
        const dx = Math.abs(x - tStartX), dy = Math.abs(y - tStartY);
        if (dx < 8 && dy < 8) { tLastX = x; tLastY = y; return; } // too small to decide
        // horizontal-ish drag -> rotate; vertical drag -> let the page scroll
        if (dx > dy) { gestureLocked = true; } else { touching = false; return; }
      }
      e.preventDefault(); // we own this gesture now -> stop page scroll
      rotY += (x - tLastX) * 0.006;
      rotX += (y - tLastY) * 0.006;
      rotX = Math.max(-0.6, Math.min(0.6, rotX));
      tLastX = x; tLastY = y;
    };
    const onTouchEnd = () => { touching = false; gestureLocked = false; };
    renderer.domElement.addEventListener('touchstart', onTouchStart, { passive: true });
    renderer.domElement.addEventListener('touchmove', onTouchMove, { passive: false });
    renderer.domElement.addEventListener('touchend', onTouchEnd);
    renderer.domElement.addEventListener('touchcancel', onTouchEnd);

    // ── animation loop ───────────────────────────────────────────
    const clock = new THREE.Clock();
    let raf = 0;
    let lastMode = data.mode;
    function animate() {
      raf = requestAnimationFrame(animate);
      const t = clock.getElapsedTime();
      const d = dataRef.current;

      // rebuild on data signature change
      const sig = JSON.stringify({
        m: d.mode, v: (d.validators ?? []).map(x => [x.group, x.phase, x.vote, Math.round((x.reputation ?? 0) * 20)]),
        c: d.claimsCount, vi: d.vicsCount, cf: d.confidence, df: d.dFinal, rp: d.roundPhase,
        th: d.theta, sg: d.sigma, ap: d.approved, tt: d.total,
      });
      if (sig !== (animate as any)._sig) {
        (animate as any)._sig = sig;
        build(d);
      }

      if (autoRotate) rotY = Math.sin(t * 0.08) * 0.25;
      root.rotation.y = rotY;
      root.rotation.x = rotX;

      // pulse animated objects
      pulseObjects.forEach((o, i) => {
        const s = 1 + Math.sin(t * 1.5 + i) * 0.06;
        o.scale.setScalar(s);
        o.rotation.y = t * 0.3;
      });
      // float validators + scored glow
      validatorMeshes.forEach((vm, i) => {
        vm.mesh.position.y = vm.base.y + Math.sin(t * 1.2 + i) * 0.04;
        if (vm.v.phase === 'scored' && vm.v.score != null) {
          const em = (vm.mesh.material as THREE.MeshPhongMaterial);
          em.emissive = new THREE.Color(vm.v.vote === 1 ? 0x16a34a : 0xf59e0b);
          em.emissiveIntensity = 0.2 + Math.abs(Math.sin(t * 2 + i)) * 0.3;
        }
      });

      renderer.render(scene, camera);
    }
    animate();

    // ── resize ───────────────────────────────────────────────────
    const onResize = () => {
      const w = mount.clientWidth;
      renderer.setSize(w, vh);
      camera.aspect = w / vh;
      camera.updateProjectionMatrix();
    };
    window.addEventListener('resize', onResize);

    return () => {
      cancelAnimationFrame(raf);
      renderer.domElement.removeEventListener('mousedown', onDown);
      window.removeEventListener('mouseup', onUp);
      window.removeEventListener('mousemove', onMove);
      renderer.domElement.removeEventListener('touchstart', onTouchStart);
      renderer.domElement.removeEventListener('touchmove', onTouchMove);
      renderer.domElement.removeEventListener('touchend', onTouchEnd);
      renderer.domElement.removeEventListener('touchcancel', onTouchEnd);
      window.removeEventListener('resize', onResize);
      disposeGroup(root);
      renderer.dispose();
      if (mount.contains(renderer.domElement)) mount.removeChild(renderer.domElement);
    };
  }, [vh]);

  return <div ref={mountRef} style={{ width: '100%', height: vh, touchAction: 'pan-y' }} className="rounded-lg overflow-hidden" />;
}
