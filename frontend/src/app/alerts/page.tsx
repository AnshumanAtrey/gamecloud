'use client';
import { useQueryClient } from '@tanstack/react-query';
import { Check, Eye } from 'lucide-react';
import { useState } from 'react';

import { Shell } from '@/components/Shell';
import { Card, Loading, Pill } from '@/components/ui';
import { getAlerts, updateAlert } from '@/lib/api';
import { timeAgo } from '@/lib/format';
import { useLive } from '@/lib/useLive';

const FILTERS = ['all', 'active', 'ack', 'resolved'];

export default function AlertsPage() {
  const qc = useQueryClient();
  const { data } = useLive('alerts', () => getAlerts(), 3000);
  const [filter, setFilter] = useState('all');

  const act = async (id: string, action: 'ack' | 'resolve') => {
    await updateAlert(id, action);
    qc.invalidateQueries({ queryKey: ['alerts'] });
    qc.invalidateQueries({ queryKey: ['snapshot'] });
    qc.invalidateQueries({ queryKey: ['audit'] });
  };

  if (!data) return <Shell><Loading /></Shell>;
  const filtered = data.filter((a) => filter === 'all' || a.status === filter);
  const counts = {
    active: data.filter((a) => a.status === 'active').length,
    ack: data.filter((a) => a.status === 'ack').length,
    resolved: data.filter((a) => a.status === 'resolved').length,
  };

  return (
    <Shell>
      <div className="space-y-5">
        <div>
          <h1 className="text-xl font-bold">Monitoring &amp; Alerts</h1>
          <p className="text-sm text-slate-500">
            {counts.active} active · {counts.ack} acknowledged · {counts.resolved} resolved
          </p>
        </div>

        <div className="flex gap-2">
          {FILTERS.map((f) => (
            <button key={f} onClick={() => setFilter(f)} className={`rounded-lg px-3 py-1.5 text-xs capitalize ${filter === f ? 'bg-accent/15 text-white' : 'text-slate-400 hover:bg-white/5'}`}>
              {f}
            </button>
          ))}
        </div>

        <div className="space-y-2">
          {filtered.map((a) => (
            <Card key={a.id} className="flex flex-wrap items-center justify-between gap-3 p-3.5">
              <div className="flex min-w-0 items-center gap-3">
                <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${a.severity === 'critical' ? 'bg-bad' : a.severity === 'warning' ? 'bg-warn' : 'bg-accent2'} ${a.status === 'active' ? 'live-dot' : ''}`} />
                <div className="min-w-0">
                  <div className="truncate text-sm">{a.message}</div>
                  <div className="text-[11px] text-slate-600">
                    <span className="font-mono">{a.source}</span> · {timeAgo(a.created_at)}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Pill status={a.severity} />
                <Pill status={a.status} />
                {a.status === 'active' && (
                  <button onClick={() => act(a.id, 'ack')} className="flex items-center gap-1 rounded-lg bg-warn/15 px-2.5 py-1 text-[11px] text-warn hover:bg-warn/25">
                    <Eye size={12} /> Ack
                  </button>
                )}
                {a.status !== 'resolved' && (
                  <button onClick={() => act(a.id, 'resolve')} className="flex items-center gap-1 rounded-lg bg-good/15 px-2.5 py-1 text-[11px] text-good hover:bg-good/25">
                    <Check size={12} /> Resolve
                  </button>
                )}
              </div>
            </Card>
          ))}
          {filtered.length === 0 && <div className="py-12 text-center text-sm text-slate-600">No {filter} alerts.</div>}
        </div>
      </div>
    </Shell>
  );
}
