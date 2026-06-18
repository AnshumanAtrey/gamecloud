'use client';
import { useQueryClient } from '@tanstack/react-query';
import { Check, Plus, X } from 'lucide-react';
import { useState } from 'react';

import { Shell } from '@/components/Shell';
import { Card, Loading, Pill, SectionTitle } from '@/components/ui';
import { createWorkflow, decideWorkflow, getWorkflows } from '@/lib/api';
import { canApprove, useAuth } from '@/lib/auth';
import { fmtMoneyFull, timeAgo } from '@/lib/format';
import { useLive } from '@/lib/useLive';

const TYPES = ['fleet_provision', 'region_expansion', 'tournament', 'refund', 'maintenance'];
const FILTERS = ['all', 'pending', 'approved', 'rejected'];

export default function WorkflowsPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { data } = useLive('workflows', getWorkflows, 3000);
  const [filter, setFilter] = useState('all');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ type: 'fleet_provision', title: '', detail: '', amount: '', region_code: '' });
  const [busy, setBusy] = useState(false);

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ['workflows'] });
    qc.invalidateQueries({ queryKey: ['snapshot'] });
    qc.invalidateQueries({ queryKey: ['audit'] });
  };

  const decide = async (id: string, d: 'approved' | 'rejected') => {
    await decideWorkflow(id, d);
    refresh();
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) return;
    setBusy(true);
    try {
      await createWorkflow({
        type: form.type,
        title: form.title,
        detail: form.detail,
        amount: form.amount ? Number(form.amount) : null,
        region_code: form.region_code || null,
      });
      setForm({ type: 'fleet_provision', title: '', detail: '', amount: '', region_code: '' });
      setShowForm(false);
      refresh();
    } finally {
      setBusy(false);
    }
  };

  if (!data) return <Shell><Loading /></Shell>;
  const filtered = data.filter((w) => filter === 'all' || w.status === filter);

  return (
    <Shell>
      <div className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold">Approval Workflows</h1>
            <p className="text-sm text-slate-500">
              Operational change requests · {canApprove(user?.role) ? 'you can approve / reject' : 'request only — approvals need manager/admin'}
            </p>
          </div>
          <button onClick={() => setShowForm((s) => !s)} className="flex items-center gap-1.5 rounded-lg bg-accent px-3 py-2 text-sm font-medium text-white hover:opacity-90">
            <Plus size={15} /> New request
          </button>
        </div>

        {showForm && (
          <Card className="p-4">
            <form onSubmit={submit} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-[11px] uppercase text-slate-500">Type</label>
                <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className="w-full rounded-lg border border-line bg-ink px-3 py-2 text-sm outline-none focus:border-accent">
                  {TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-[11px] uppercase text-slate-500">Region (optional)</label>
                <input value={form.region_code} onChange={(e) => setForm({ ...form, region_code: e.target.value })} placeholder="ap-south-1" className="w-full rounded-lg border border-line bg-ink px-3 py-2 text-sm outline-none focus:border-accent" />
              </div>
              <div className="sm:col-span-2">
                <label className="mb-1 block text-[11px] uppercase text-slate-500">Title</label>
                <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Add battle-royale fleet in ap-south-1" className="w-full rounded-lg border border-line bg-ink px-3 py-2 text-sm outline-none focus:border-accent" />
              </div>
              <div className="sm:col-span-2">
                <label className="mb-1 block text-[11px] uppercase text-slate-500">Detail</label>
                <textarea value={form.detail} onChange={(e) => setForm({ ...form, detail: e.target.value })} rows={2} className="w-full rounded-lg border border-line bg-ink px-3 py-2 text-sm outline-none focus:border-accent" />
              </div>
              <div>
                <label className="mb-1 block text-[11px] uppercase text-slate-500">Est. monthly cost (USD)</label>
                <input value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} type="number" placeholder="9800" className="w-full rounded-lg border border-line bg-ink px-3 py-2 text-sm outline-none focus:border-accent" />
              </div>
              <div className="flex items-end">
                <button type="submit" disabled={busy} className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50">
                  {busy ? 'Submitting…' : 'Submit request'}
                </button>
              </div>
            </form>
          </Card>
        )}

        <div className="flex gap-2">
          {FILTERS.map((f) => (
            <button key={f} onClick={() => setFilter(f)} className={`rounded-lg px-3 py-1.5 text-xs capitalize ${filter === f ? 'bg-accent/15 text-white' : 'text-slate-400 hover:bg-white/5'}`}>
              {f}
            </button>
          ))}
        </div>

        <div className="space-y-2">
          {filtered.map((w) => (
            <Card key={w.id} className="p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="rounded bg-panel2 px-2 py-0.5 font-mono text-[10px] uppercase text-accent2">{w.type}</span>
                    <Pill status={w.status} />
                    {w.region_code && <span className="font-mono text-[11px] text-slate-500">{w.region_code}</span>}
                  </div>
                  <div className="mt-1.5 font-medium">{w.title}</div>
                  {w.detail && <div className="text-sm text-slate-400">{w.detail}</div>}
                  <div className="mt-1 text-[11px] text-slate-600">
                    requested by <span className="text-slate-400">{w.requested_by}</span> · {timeAgo(w.created_at)}
                    {w.amount ? <> · est. <span className="text-slate-400">{fmtMoneyFull(w.amount)}/mo</span></> : null}
                    {w.approver ? <> · {w.status} by <span className="text-slate-400">{w.approver}</span></> : null}
                  </div>
                </div>
                {w.status === 'pending' && canApprove(user?.role) && (
                  <div className="flex shrink-0 gap-2">
                    <button onClick={() => decide(w.id, 'approved')} className="flex items-center gap-1 rounded-lg bg-good/15 px-3 py-1.5 text-xs font-medium text-good hover:bg-good/25">
                      <Check size={14} /> Approve
                    </button>
                    <button onClick={() => decide(w.id, 'rejected')} className="flex items-center gap-1 rounded-lg bg-bad/15 px-3 py-1.5 text-xs font-medium text-bad hover:bg-bad/25">
                      <X size={14} /> Reject
                    </button>
                  </div>
                )}
              </div>
            </Card>
          ))}
          {filtered.length === 0 && <div className="py-12 text-center text-sm text-slate-600">No {filter} workflows.</div>}
        </div>
      </div>
    </Shell>
  );
}
