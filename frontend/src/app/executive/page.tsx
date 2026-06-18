'use client';
import { Activity, DollarSign, Gauge, Globe2, Lock, TrendingUp, Users } from 'lucide-react';

import { Shell } from '@/components/Shell';
import { Bar, Card, KpiCard, Loading, Pill, SectionTitle } from '@/components/ui';
import { getExec } from '@/lib/api';
import { canViewExec, useAuth } from '@/lib/auth';
import { fmtInt, fmtMoneyFull } from '@/lib/format';
import { useLive } from '@/lib/useLive';

export default function ExecutivePage() {
  const { user } = useAuth();
  const { data } = useLive('exec', getExec, 4000);

  if (user && !canViewExec(user.role)) {
    return (
      <Shell>
        <div className="flex h-64 flex-col items-center justify-center gap-2 text-slate-500">
          <Lock size={28} /> The executive portal is restricted to managers and admins.
        </div>
      </Shell>
    );
  }
  if (!data) return <Shell><Loading /></Shell>;

  return (
    <Shell>
      <div className="space-y-6">
        <div>
          <h1 className="text-xl font-bold">Executive Portal</h1>
          <p className="text-sm text-slate-500">Aggregated leadership view — platform performance at a glance</p>
        </div>

        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <KpiCard label="Revenue today" value={fmtMoneyFull(data.revenue_today)} sub="gross, all regions" icon={<DollarSign size={16} />} accent="text-good" />
          <KpiCard label="Revenue (30d proj.)" value={fmtMoneyFull(data.revenue_30d)} sub="run-rate projection" icon={<TrendingUp size={16} />} accent="text-good" />
          <KpiCard label="Live CCU" value={fmtInt(data.ccu)} sub={`peak ${fmtInt(data.peak_ccu_24h)}`} icon={<Users size={16} />} accent="text-accent2" />
          <KpiCard label="Platform uptime" value={`${data.uptime_pct.toFixed(2)}%`} sub="rolling SLA" icon={<Activity size={16} />} accent={data.uptime_pct >= 99.9 ? 'text-good' : 'text-warn'} />
          <KpiCard label="Sessions today" value={fmtInt(data.sessions_today)} sub="cumulative" icon={<Gauge size={16} />} />
          <KpiCard label="Matches today" value={fmtInt(data.matches_today)} sub="cumulative" icon={<Activity size={16} />} />
          <KpiCard label="Active regions" value={`${data.active_regions}`} sub="multi-region" icon={<Globe2 size={16} />} />
          <KpiCard label="Capacity used" value={`${data.capacity_utilization_pct.toFixed(1)}%`} sub={`${fmtInt(data.total_fleet_capacity)} CCU provisioned`} icon={<Gauge size={16} />} accent={data.capacity_utilization_pct > 85 ? 'text-warn' : 'text-white'} />
        </div>

        <div>
          <SectionTitle>Regional Performance</SectionTitle>
          <Card className="overflow-x-auto p-0">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-line text-[11px] uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3 font-medium">Region</th>
                  <th className="px-4 py-3 font-medium">Code</th>
                  <th className="px-4 py-3 font-medium">Live CCU</th>
                  <th className="px-4 py-3 font-medium">Capacity</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line/60">
                {data.region_breakdown.map((r) => (
                  <tr key={r.code} className="hover:bg-white/[0.02]">
                    <td className="px-4 py-3 font-medium">{r.name || r.code}</td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-500">{r.code}</td>
                    <td className="px-4 py-3 font-mono">{fmtInt(r.ccu)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="w-10 font-mono text-xs text-slate-400">{(r.capacity_pct ?? 0).toFixed(0)}%</span>
                        <div className="w-28"><Bar pct={r.capacity_pct ?? 0} /></div>
                      </div>
                    </td>
                    <td className="px-4 py-3"><Pill status={r.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </div>
      </div>
    </Shell>
  );
}
