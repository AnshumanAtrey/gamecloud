'use client';
import { Cpu, MemoryStick, Power, RotateCcw, TriangleAlert } from 'lucide-react';
import { useState } from 'react';

import { Shell } from '@/components/Shell';
import { Bar, Card, Loading, Pill, SectionTitle } from '@/components/ui';
import { chaos, getFleets, getSnapshot } from '@/lib/api';
import { isAdmin, useAuth } from '@/lib/auth';
import { fmtInt } from '@/lib/format';
import { useLive } from '@/lib/useLive';

export default function RegionsPage() {
  const { user } = useAuth();
  const { data: snap } = useLive('snapshot', getSnapshot, 2000);
  const { data: fleets } = useLive('fleets', getFleets, 2000);
  const [note, setNote] = useState('');

  const drill = async (code: string, action: 'degrade' | 'offline' | 'restore') => {
    try {
      const r = await chaos(code, action);
      setNote(r.detail);
    } catch (e) {
      setNote(e instanceof Error ? e.message : 'failed');
    }
    setTimeout(() => setNote(''), 4500);
  };

  if (!snap || !fleets) return <Shell><Loading /></Shell>;

  return (
    <Shell>
      <div className="space-y-6">
        <div>
          <h1 className="text-xl font-bold">Regions &amp; Fleets</h1>
          <p className="text-sm text-slate-500">Multi-region capacity, elasticity &amp; expansion management</p>
        </div>

        {isAdmin(user?.role) && (
          <Card className="p-4">
            <SectionTitle right={note ? <span className="font-mono text-xs text-accent2">{note}</span> : undefined}>
              <span className="flex items-center gap-2"><TriangleAlert size={14} className="text-warn" /> Disaster-Recovery Drill (admin)</span>
            </SectionTitle>
            <p className="mb-3 text-xs text-slate-500">
              Simulate a cloud-region incident — the platform keeps serving the healthy regions while the
              console reflects the outage. Restore to recover.
            </p>
            <div className="flex flex-wrap items-center gap-2">
              {snap.regions.map((r) => (
                <div key={r.code} className="flex items-center gap-1 rounded-lg border border-line bg-panel2/50 p-1">
                  <span className="px-2 font-mono text-[11px] text-slate-400">{r.code}</span>
                  <button onClick={() => drill(r.code, 'degrade')} className="rounded bg-warn/15 px-2 py-1 text-[11px] text-warn hover:bg-warn/25">degrade</button>
                  <button onClick={() => drill(r.code, 'offline')} className="rounded bg-bad/15 px-2 py-1 text-[11px] text-bad hover:bg-bad/25">offline</button>
                </div>
              ))}
              <button onClick={() => drill('*', 'restore')} className="ml-auto flex items-center gap-1 rounded-lg bg-good/15 px-3 py-1.5 text-xs font-medium text-good hover:bg-good/25">
                <RotateCcw size={13} /> Restore all
              </button>
            </div>
          </Card>
        )}

        <div className="space-y-4">
          {snap.regions.map((r) => {
            const rf = fleets.filter((f) => f.region_code === r.code);
            return (
              <Card key={r.code} className="p-4">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <Power size={16} className={r.status === 'offline' ? 'text-bad' : r.status === 'degraded' ? 'text-warn' : 'text-good'} />
                    <div>
                      <div className="font-medium">{r.name}</div>
                      <div className="font-mono text-[11px] text-slate-500">{r.code} · {r.city}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className="font-mono text-sm">{fmtInt(r.ccu)}</div>
                      <div className="text-[10px] uppercase text-slate-500">CCU</div>
                    </div>
                    <Pill status={r.status} />
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="text-[11px] uppercase tracking-wide text-slate-500">
                        <th className="pb-2 font-medium">Fleet</th>
                        <th className="pb-2 font-medium">Instance</th>
                        <th className="pb-2 font-medium">CCU / cap</th>
                        <th className="hidden pb-2 font-medium sm:table-cell"><span className="flex items-center gap-1"><Cpu size={12} /> CPU</span></th>
                        <th className="hidden pb-2 font-medium sm:table-cell"><span className="flex items-center gap-1"><MemoryStick size={12} /> Mem</span></th>
                        <th className="pb-2 font-medium">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-line/60">
                      {rf.map((f) => (
                        <tr key={f.id}>
                          <td className="py-2 font-medium">{f.name}</td>
                          <td className="py-2 font-mono text-xs text-accent2">{f.instance_type}</td>
                          <td className="py-2 font-mono text-xs text-slate-400">{fmtInt(f.ccu)} / {fmtInt(f.max_cap)}</td>
                          <td className="hidden py-2 sm:table-cell">
                            <div className="flex items-center gap-2"><span className="w-9 font-mono text-xs">{f.cpu_pct.toFixed(0)}%</span><div className="w-20"><Bar pct={f.cpu_pct} /></div></div>
                          </td>
                          <td className="hidden py-2 sm:table-cell">
                            <div className="flex items-center gap-2"><span className="w-9 font-mono text-xs">{f.mem_pct.toFixed(0)}%</span><div className="w-20"><Bar pct={f.mem_pct} /></div></div>
                          </td>
                          <td className="py-2"><Pill status={f.status} /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            );
          })}
        </div>
      </div>
    </Shell>
  );
}
