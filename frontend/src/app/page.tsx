'use client';
import { Bell, DollarSign, Gauge, Layers, Swords, Users } from 'lucide-react';
import Link from 'next/link';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

import { Shell } from '@/components/Shell';
import { Bar, Card, KpiCard, Loading, Pill, SectionTitle } from '@/components/ui';
import { getSnapshot } from '@/lib/api';
import { clockTime, fmtInt, fmtMoneyFull, fmtNum } from '@/lib/format';
import { useLive } from '@/lib/useLive';

export default function OverviewPage() {
  const { data } = useLive('snapshot', getSnapshot, 2000);

  return (
    <Shell>
      {!data ? (
        <Loading />
      ) : (
        <div className="space-y-6">
          <div>
            <h1 className="text-xl font-bold">Operations Overview</h1>
            <p className="text-sm text-slate-500">
              Real-time platform health across {data.regions.length} regions · {data.fleet_summary.total} fleets
            </p>
          </div>

          {/* KPI grid */}
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
            <KpiCard label="Concurrent users" value={fmtInt(data.kpis.ccu)} sub="live CCU" icon={<Users size={16} />} accent="text-accent2" />
            <KpiCard label="Active sessions" value={fmtInt(data.kpis.sessions)} sub="in progress" icon={<Layers size={16} />} />
            <KpiCard label="Matches / min" value={fmtInt(data.kpis.matches_per_min)} sub="matchmaking" icon={<Swords size={16} />} />
            <KpiCard label="Revenue today" value={fmtMoneyFull(data.kpis.revenue)} sub="gross, all regions" icon={<DollarSign size={16} />} accent="text-good" />
            <KpiCard label="Avg latency" value={`${data.kpis.avg_latency_ms.toFixed(0)} ms`} sub={`err ${data.kpis.error_rate.toFixed(2)}%`} icon={<Gauge size={16} />} accent={data.kpis.avg_latency_ms > 50 ? 'text-warn' : 'text-white'} />
            <KpiCard label="Active alerts" value={String(data.alerts_active)} sub={`${data.workflows_pending} approvals pending`} icon={<Bell size={16} />} accent={data.alerts_active > 0 ? 'text-warn' : 'text-good'} />
          </div>

          {/* live CCU chart */}
          <Card className="p-4">
            <SectionTitle right={<span className="font-mono text-xs text-slate-500">last 90s</span>}>
              Concurrent Users — live
            </SectionTitle>
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart data={data.history}>
                <defs>
                  <linearGradient id="ccuFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#6366f1" stopOpacity={0.5} />
                    <stop offset="100%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis dataKey="ts" tickFormatter={(t) => clockTime(t).slice(0, 5)} tick={{ fontSize: 10, fill: '#64748b' }} minTickGap={48} />
                <YAxis tickFormatter={(v) => fmtNum(v as number)} tick={{ fontSize: 10, fill: '#64748b' }} width={42} />
                <Tooltip
                  contentStyle={{ background: '#0d1320', border: '1px solid #1e293b', borderRadius: 8, fontSize: 12 }}
                  labelFormatter={(t) => clockTime(t as number)}
                  formatter={(v) => [fmtInt(v as number), 'CCU']}
                />
                <Area type="monotone" dataKey="ccu" stroke="#6366f1" strokeWidth={2} fill="url(#ccuFill)" isAnimationActive={false} />
              </AreaChart>
            </ResponsiveContainer>
          </Card>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            {/* regions */}
            <div className="lg:col-span-2">
              <SectionTitle right={<Link href="/regions" className="text-xs text-accent hover:underline">view all →</Link>}>
                Regions
              </SectionTitle>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {data.regions.map((r) => (
                  <Card key={r.code} className="p-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-sm font-medium">{r.name}</div>
                        <div className="font-mono text-[11px] text-slate-500">{r.code}</div>
                      </div>
                      <Pill status={r.status} />
                    </div>
                    <div className="mt-3 flex items-center justify-between text-xs text-slate-400">
                      <span>{fmtInt(r.ccu)} CCU</span>
                      <span>{r.capacity_pct.toFixed(0)}% cap</span>
                    </div>
                    <div className="mt-1.5">
                      <Bar pct={r.capacity_pct} />
                    </div>
                  </Card>
                ))}
              </div>
            </div>

            {/* fleet summary */}
            <div>
              <SectionTitle>Fleet Capacity</SectionTitle>
              <Card className="space-y-4 p-4">
                <div>
                  <div className="font-mono text-3xl font-bold">{fmtInt(data.fleet_summary.total_capacity)}</div>
                  <div className="text-xs text-slate-500">total CCU capacity provisioned</div>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="rounded-lg border border-good/20 bg-good/5 py-2">
                    <div className="font-mono text-lg font-bold text-good">{data.fleet_summary.active}</div>
                    <div className="text-[10px] uppercase text-slate-500">active</div>
                  </div>
                  <div className="rounded-lg border border-warn/20 bg-warn/5 py-2">
                    <div className="font-mono text-lg font-bold text-warn">{data.fleet_summary.scaling}</div>
                    <div className="text-[10px] uppercase text-slate-500">scaling</div>
                  </div>
                  <div className="rounded-lg border border-bad/20 bg-bad/5 py-2">
                    <div className="font-mono text-lg font-bold text-bad">{data.fleet_summary.offline}</div>
                    <div className="text-[10px] uppercase text-slate-500">offline</div>
                  </div>
                </div>
                <Link href="/workflows" className="block rounded-lg border border-line bg-panel2/50 px-3 py-2 text-xs text-slate-300 hover:border-accent/40">
                  {data.workflows_pending} workflow{data.workflows_pending === 1 ? '' : 's'} awaiting approval →
                </Link>
              </Card>
            </div>
          </div>
        </div>
      )}
    </Shell>
  );
}
