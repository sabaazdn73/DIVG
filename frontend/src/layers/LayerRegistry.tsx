import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Users, Plus, Hash, Briefcase } from 'lucide-react';
import { apiRegistry, apiRegister, Entity } from '../lib/api';
import DIVGScene, { SceneValidator } from '../components/DIVGScene';

const GROUPS = [
  { id: 'employee',    label: 'Employee',    color: 'bg-blue-50 text-blue-700 border-blue-200' },
  { id: 'expert',      label: 'Expert',      color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  { id: 'beneficiary', label: 'Beneficiary', color: 'bg-amber-50 text-amber-700 border-amber-200' },
  { id: 'firm',        label: 'Firm',        color: 'bg-teal-50 text-teal-700 border-teal-200' },
  { id: 'investor',    label: 'Investor',    color: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
];

export default function LayerRegistry() {
  const [data, setData] = useState<any>({ validators: [], firms: [], investors: [] });
  const [form, setForm] = useState({ full_name: '', email: '', affiliation: '', group: 'expert' });
  const [pending, setPending] = useState(false);
  const [last, setLast] = useState<any>(null);

  async function load() { setData(await apiRegistry()); }
  useEffect(() => { load(); }, []);

  async function submit(e: any) {
    e.preventDefault();
    setPending(true);
    try {
      const res = await apiRegister(form);
      setLast(res);
      setForm({ full_name: '', email: '', affiliation: '', group: form.group });
      await load();
    } catch (e: any) { alert(e?.response?.data?.error || e.message); }
    finally { setPending(false); }
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
    <div className="max-w-7xl mx-auto px-6 py-10">
      <Hero n="01" title="Identity Layer"
        sub="Register unlimited stakeholders with W3C DIDs, anchored on SUI as a shared Registry object. Each becomes a node in the verification graph." />

      <div className="card p-2 mb-6">
        <DIVGScene data={{ mode: 'registry', validators: sceneValidators }} height={560} />
        <div className="px-3 pb-2 text-[10px] mono text-muted text-center">
          live validator pool &middot; sphere size = reputation &middot; colour = stakeholder group
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="lg:col-span-2">
          <div className="card p-5">
            <div className="flex items-center gap-2 mb-4">
              <Plus className="w-4 h-4 text-firm" /><h2 className="font-semibold text-sm">Register entity</h2>
            </div>
            <form onSubmit={submit} className="space-y-3">
              <Field label="Full name" value={form.full_name} onChange={(v) => setForm({ ...form, full_name: v })} required />
              <Field label="Email" value={form.email} onChange={(v) => setForm({ ...form, email: v })} required type="email" />
              <Field label="Affiliation" value={form.affiliation} onChange={(v) => setForm({ ...form, affiliation: v })} />
              <div>
                <label className="block text-[10px] mono uppercase tracking-wide text-muted mb-1.5">Stakeholder group</label>
                <select value={form.group} onChange={(e) => setForm({ ...form, group: e.target.value })}
                  className="w-full border border-border rounded-md px-3 py-2 text-sm bg-white">
                  {GROUPS.map(g => <option key={g.id} value={g.id}>{g.label}</option>)}
                </select>
              </div>
              <button type="submit" disabled={pending} className="btn btn-primary w-full disabled:opacity-50 mt-2">
                {pending ? 'Registering on-chain...' : 'Register on-chain'}
              </button>
            </form>
            {last && (
              <div className="mt-4 p-3 bg-emerald-50 border border-emerald-200 rounded-md text-xs">
                <div className="font-semibold text-emerald-900 mb-1">Registered</div>
                <div className="mono text-emerald-800 break-all">{last.entity.did}</div>
                <div className="mono text-emerald-700 text-[10px] mt-1">
                  SUI: {last.sui.digest?.slice(0, 16)}... &middot; HCS seq: {last.hcs.sequence}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="lg:col-span-3">
          <div className="card p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2"><Users className="w-4 h-4 text-firm" />
                <h2 className="font-semibold text-sm">Registry</h2></div>
              <div className="text-xs mono text-muted">{allEntities.length} entities</div>
            </div>
            <div className="grid grid-cols-5 gap-2 mb-4">
              {GROUPS.map(g => {
                const count = allEntities.filter(e => e.group === g.id).length;
                return (
                  <div key={g.id} className={`border ${g.color} rounded-md px-2 py-2 text-center`}>
                    <div className="text-lg font-bold">{count}</div>
                    <div className="text-[9px] mono uppercase tracking-wide">{g.label}</div>
                  </div>
                );
              })}
            </div>
            <div className="space-y-2 max-h-[420px] overflow-y-auto pr-2">
              {allEntities.length === 0 && (
                <div className="text-xs text-muted text-center py-12 mono">
                  No entities yet. Register above, or seed the Winnow example from Overview.
                </div>
              )}
              {allEntities.map((e, i) => (
                <motion.div key={e.address + i} initial={{ opacity: 0, x: -4 }} animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: Math.min(0.02 * i, 0.5), duration: 0.25 }}
                  className="border border-border rounded-md p-3 flex items-center gap-3 hover:bg-panel">
                  <GroupBadge group={e.group} />
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-sm">{e.full_name}</div>
                    <div className="text-[11px] text-muted truncate flex items-center gap-3">
                      <span className="flex items-center gap-1"><Briefcase className="w-3 h-3" />{e.affiliation}</span>
                      {e.simulated && <span className="text-amber-600">&middot; simulated</span>}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-[10px] mono text-muted flex items-center gap-1">
                      <Hash className="w-2.5 h-2.5" />{e.did.slice(-12)}</div>
                    <div className="text-[10px] mono text-muted mt-0.5">R = {e.reputation.toFixed(3)}</div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function GroupBadge({ group }: { group: string }) {
  const c = GROUPS.find(g => g.id === group);
  if (!c) return null;
  return <span className={`pill border ${c.color} flex-shrink-0`}>{c.label}</span>;
}

function Field({ label, value, onChange, required, type = 'text' }: any) {
  return (
    <div>
      <label className="block text-[10px] mono uppercase tracking-wide text-muted mb-1.5">{label}</label>
      <input type={type} value={value} required={required} onChange={(e) => onChange(e.target.value)}
        className="w-full border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ink/10" />
    </div>
  );
}

export function Hero({ n, title, sub }: any) {
  return (
    <div className="mb-6">
      <div className="text-[10px] mono tracking-widest text-muted mb-2 uppercase">Layer {n}</div>
      <h1 className="text-2xl md:text-3xl font-bold tracking-tight mb-2">{title}</h1>
      <p className="text-sm text-muted max-w-3xl">{sub}</p>
    </div>
  );
}
