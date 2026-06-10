import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Users, Plus, Hash, Briefcase, ShieldCheck } from 'lucide-react';
import { apiRegistry, apiRegister, apiInitiateVerification, Entity } from '../lib/api';
import DIVGScene, { SceneValidator } from '../components/DIVGScene';
import { LayerGuide } from '../components/LayerGuide';
import PortalNavigation from '../components/PortalNavigation';

const GROUPS = [
  { id: 'employee',    label: 'Employee',    color: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
  { id: 'expert',      label: 'Expert',      color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
  { id: 'beneficiary', label: 'Beneficiary', color: 'bg-amber-500/10 text-amber-400 border-amber-500/20' },
  { id: 'firm',        label: 'Firm',        color: 'bg-teal-500/10 text-teal-400 border-teal-500/20' },
  { id: 'investor',    label: 'Investor',    color: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20' },
];

export default function LayerRegistry() {
  const [data, setData] = useState<any>({ validators: [], firms: [], investors: [] });
  const [form, setForm] = useState({ full_name: '', email: '', affiliation: '', group: 'expert' });
  const [pending, setPending] = useState(false);
  const [last, setLast] = useState<any>(null);
  
  // State for the OTP verification gate
  const [verificationStep, setVerificationStep] = useState(false);
  const [otp, setOtp] = useState('');
  const [demoOtp, setDemoOtp] = useState(''); // NEW: Holds the auto-generated code for the screen

  async function load() { setData(await apiRegistry()); }
  useEffect(() => { load(); }, []);

  async function submit(e: any) {
    e.preventDefault();
    
    // Intercept submission for validators (Expert/Employee) to enforce OTP gate
    if (!verificationStep && ['expert', 'employee'].includes(form.group)) {
      setPending(true);
      try {
        // Request actual background check/verification initiation from backend
        const initRes = await apiInitiateVerification(form);
        setDemoOtp(initRes.demoOtp);
        setVerificationStep(true);
      } catch (err: any) {
        alert(err?.response?.data?.error || 'Verification failed via backend gate.');
      } finally {
        setPending(false);
      }
      return;
    }

    setPending(true);
    try {
      // Pass the OTP along to the backend
      const payload = verificationStep ? { ...form, otp } : form;
      const res = await apiRegister(payload);
      
      setLast(res);
      setForm({ full_name: '', email: '', affiliation: '', group: form.group });
      setVerificationStep(false);
      setOtp('');
      setDemoOtp('');
      await load();
    } catch (e: any) { 
      alert(e?.response?.data?.error || e.message); 
    } finally { 
      setPending(false); 
    }
  }

  const allEntities: Entity[] = [
    ...data.firms.map((x: Entity) => ({ ...x, group: 'firm' as const })),
    ...data.validators,
    ...data.investors.map((x: Entity) => ({ ...x, group: 'investor' as const })),
  ];

  const sceneValidators: SceneValidator[] = data.validators.map((v: any) => ({
    group: v.group, reputation: v.reputation, phase: 'selected' as const,
  }));

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-10 text-gray-100">
      <Hero n="01" title="Identity Layer"
        sub="Register unlimited stakeholders with W3C DIDs, anchored on SUI as a shared Registry object. Each becomes a node in the verification graph." />

      <div className="card p-2 mb-6 bg-black/20 border-white/5">
        <DIVGScene data={{ mode: 'registry', validators: sceneValidators }} height={620} />
        <div className="px-3 pb-2 text-[10px] mono text-gray-500 text-center uppercase tracking-widest">
          live validator pool &middot; sphere size = reputation &middot; colour = stakeholder group
        </div>
      </div>

      <LayerGuide
        color="#2dd4bf"
        insert={<>
          <p>Fill the form: full name, email, affiliation, and pick a stakeholder group (employee, expert, beneficiary, firm, or investor).</p>
          <p>Click <b>Register on-chain</b>. The entity gets a DID, a deterministic SUI address, and is written to the on-chain Registry.</p>
          <p>You can register unlimited entities. They all join the same pool.</p>
        </>}
        interpret={<>
          <p><b>The 3D pool</b> shows every validator as a sphere &mdash; size is reputation, colour is group (blue=employee, green=expert, amber=beneficiary).</p>
          <p><b>R</b> next to each entity is its reputation, initialised in U[0.4, 0.6] and updated via Roth-Erev reinforcement after each round.</p>
          <p>The panel for a validation round is drawn from this pool, stratified 30/30/40.</p>
        </>}
      />

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="lg:col-span-2">
          <div className="card p-5 bg-black/40 border border-white/10">
            <div className="flex items-center gap-2 mb-6 text-teal-400">
              <Plus className="w-4 h-4" /><h2 className="font-semibold text-sm uppercase tracking-wider">Register entity</h2>
            </div>
            <form onSubmit={submit} className="space-y-4">
              
              {!verificationStep ? (
                <>
                  <Field label="Full name" value={form.full_name} onChange={(v: any) => setForm({ ...form, full_name: v })} required />
                  <Field label="Email" value={form.email} onChange={(v: any) => setForm({ ...form, email: v })} required type="email" />
                  <Field label="Affiliation" value={form.affiliation} onChange={(v: any) => setForm({ ...form, affiliation: v })} />
                  <div>
                    <label className="block text-[10px] mono uppercase tracking-wide text-gray-500 mb-1.5">Stakeholder group</label>
                    <select value={form.group} onChange={(e) => setForm({ ...form, group: e.target.value })}
                      className="w-full border border-white/10 rounded-md px-3 py-2 text-sm bg-[#05030A] text-white focus:ring-1 focus:ring-teal-500 outline-none">
                      {GROUPS.map(g => <option key={g.id} value={g.id}>{g.label}</option>)}
                    </select>
                  </div>

                  {/* Honest note regarding Beneficiary selection */}
                  {form.group === 'beneficiary' && (
                    <div className="mt-2 p-2 bg-amber-500/10 border border-amber-500/20 rounded text-[10px] text-amber-400 leading-relaxed">
                      <strong>Research Note:</strong> Beneficiary validators are optional. Real-world programmatic access to beneficiaries is often prohibitive. In live deployments, this quota is typically folded into the Expert/Employee tranches.
                    </div>
                  )}

                  <button type="submit" disabled={pending} className="w-full btn bg-teal-500 text-black font-bold py-2 rounded-md hover:bg-teal-400 transition-all disabled:opacity-50 mt-2">
                    {['expert', 'employee'].includes(form.group) ? 'Proceed to Verification' : 'Register on-chain'}
                  </button>
                </>
              ) : (
                /* OTP Gate UI */
                <div className="space-y-4 py-2">
                  <div className="flex items-center gap-2 text-teal-400 bg-teal-500/10 p-3 rounded-md border border-teal-500/20">
                    <ShieldCheck className="w-5 h-5" />
                    <div className="text-xs font-bold uppercase tracking-widest">Validator Gate Active</div>
                  </div>
                  <p className="text-xs text-gray-400 leading-relaxed">
                    We have requested a background check via SerpAPI for <strong>{form.affiliation}</strong> and sent a demo OTP to <strong>{form.email}</strong>.
                  </p>
                  
                  {/* THE DEMO OTP DISPLAY BLOCK */}
                  <div className="bg-[#05030A] border border-white/5 rounded-md p-4 text-center">
                    <div className="text-[9px] mono uppercase text-gray-500 mb-1">Demo Mode: Check your email</div>
                    <div className="text-2xl font-bold tracking-[0.5em] text-teal-400 mono">{demoOtp}</div>
                  </div>

                  <Field label="Enter OTP" value={otp} onChange={setOtp} required />
                  
                  <div className="flex gap-2 mt-4">
                    <button type="button" onClick={() => setVerificationStep(false)} className="btn bg-white/5 flex-1 hover:bg-white/10 text-white rounded-md">
                      Back
                    </button>
                    <button type="submit" disabled={pending || !otp} className="btn bg-teal-500 text-black font-bold flex-1 rounded-md disabled:opacity-50">
                      {pending ? 'Verifying...' : 'Verify & Mint DID'}
                    </button>
                  </div>
                </div>
              )}

            </form>
            {last && (
              <div className="mt-6 p-4 bg-emerald-900/20 border border-emerald-500/30 rounded-md text-xs">
                <div className="font-bold text-emerald-400 mb-1 uppercase tracking-widest text-[10px]">Registration Success</div>
                <div className="mono text-emerald-200/80 break-all">{last.entity.did}</div>
                <div className="mono text-emerald-500/80 text-[10px] mt-1">
                  SUI: {last.sui.digest?.slice(0, 16)}... &middot; HCS seq: {last.hcs.sequence}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="lg:col-span-3">
          <div className="card p-5 bg-black/40 border border-white/10">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2 text-teal-400"><Users className="w-4 h-4" />
                <h2 className="font-semibold text-sm uppercase tracking-wider">Registry</h2></div>
              <div className="text-[10px] mono text-gray-500 tracking-widest">{allEntities.length} ENTITIES</div>
            </div>
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 mb-6">
              {GROUPS.map(g => {
                const count = allEntities.filter(e => e.group === g.id).length;
                return (
                  <div key={g.id} className={`border ${g.color} rounded-md px-2 py-3 text-center`}>
                    <div className="text-xl font-bold">{count}</div>
                    <div className="text-[8px] mono uppercase tracking-widest">{g.label}</div>
                  </div>
                );
              })}
            </div>
            <div className="space-y-2 max-h-[420px] overflow-y-auto pr-2 custom-scrollbar">
              {allEntities.length === 0 && (
                <div className="text-xs text-gray-500 text-center py-12 mono">
                  No entities yet. Register above, or seed the Winnow example from Overview.
                </div>
              )}
              {allEntities.map((e, i) => (
                <motion.div key={e.address + i} initial={{ opacity: 0, x: -4 }} animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: Math.min(0.02 * i, 0.5), duration: 0.25 }}
                  className="border border-white/5 rounded-md p-3 flex items-center gap-3 bg-white/5 hover:bg-white/10 transition-colors">
                  <GroupBadge group={e.group} />
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-sm text-white">{e.full_name}</div>
                    <div className="text-[11px] text-gray-400 truncate flex items-center gap-2">
                      <span className="flex items-center gap-1"><Briefcase className="w-3 h-3" />{e.affiliation}</span>
                      {e.simulated && <span className="text-amber-500">&middot; simulated</span>}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-[9px] mono text-gray-500 flex items-center gap-1">
                      <Hash className="w-2.5 h-2.5" />{e.did.slice(-12)}</div>
                    <div className="text-[9px] mono text-teal-400 mt-0.5">R = {e.reputation.toFixed(3)}</div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* IMPLEMENTED SMART NAVIGATION HERE */}
      <PortalNavigation />

    </div>
  );
}

function GroupBadge({ group }: { group: string }) {
  const c = GROUPS.find(g => g.id === group);
  if (!c) return null;
  return <span className={`text-[9px] px-2 py-0.5 rounded mono uppercase tracking-wider border ${c.color} flex-shrink-0`}>{c.label}</span>;
}

function Field({ label, value, onChange, required, type = 'text' }: any) {
  return (
    <div>
      <label className="block text-[10px] mono uppercase tracking-wide text-gray-500 mb-1.5">{label}</label>
      <input type={type} value={value} required={required} onChange={(e) => onChange(e.target.value)}
        className="w-full border border-white/10 rounded-md px-3 py-2 text-sm bg-[#05030A] text-white focus:ring-1 focus:ring-teal-500 outline-none" />
    </div>
  );
}

export function Hero({ n, title, sub }: any) {
  return (
    <div className="mb-8">
      <div className="text-[10px] mono tracking-[0.2em] text-teal-400 mb-2 uppercase">Layer {n}</div>
      <h1 className="text-3xl font-bold tracking-tight mb-3 text-white">{title}</h1>
      <p className="text-sm text-gray-400 max-w-3xl leading-relaxed">{sub}</p>
    </div>
  );
}