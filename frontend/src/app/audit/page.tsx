'use client';
import { Lock } from 'lucide-react';

import { Shell } from '@/components/Shell';
import { Card, Loading, Pill } from '@/components/ui';
import { getAudit } from '@/lib/api';
import { canViewAudit, useAuth } from '@/lib/auth';
import { clockTime, timeAgo } from '@/lib/format';
import { useLive } from '@/lib/useLive';

export default function AuditPage() {
  const { user } = useAuth();
  const { data } = useLive('audit', getAudit, 4000);

  if (user && !canViewAudit(user.role)) {
    return (
      <Shell>
        <div className="flex h-64 flex-col items-center justify-center gap-2 text-slate-500">
          <Lock size={28} /> Audit log is restricted to managers and admins.
        </div>
      </Shell>
    );
  }
  if (!data) return <Shell><Loading /></Shell>;

  return (
    <Shell>
      <div className="space-y-5">
        <div>
          <h1 className="text-xl font-bold">Audit Log</h1>
          <p className="text-sm text-slate-500">Append-only operational record — database-backed, for compliance</p>
        </div>

        <Card className="overflow-x-auto p-0">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-line text-[11px] uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3 font-medium">#</th>
                <th className="px-4 py-3 font-medium">Actor</th>
                <th className="px-4 py-3 font-medium">Action</th>
                <th className="px-4 py-3 font-medium">Entity</th>
                <th className="px-4 py-3 font-medium">Detail</th>
                <th className="px-4 py-3 font-medium">When</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line/60">
              {data.map((a) => (
                <tr key={a.id} className="hover:bg-white/[0.02]">
                  <td className="px-4 py-2.5 font-mono text-xs text-slate-600">{a.id}</td>
                  <td className="px-4 py-2.5 font-mono text-xs text-accent2">{a.actor}</td>
                  <td className="px-4 py-2.5"><Pill status={a.action} label={a.action} /></td>
                  <td className="px-4 py-2.5 text-slate-400">{a.entity}</td>
                  <td className="px-4 py-2.5 text-slate-300">{a.detail}</td>
                  <td className="px-4 py-2.5 text-xs text-slate-500" title={clockTime(a.created_at)}>{timeAgo(a.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </div>
    </Shell>
  );
}
