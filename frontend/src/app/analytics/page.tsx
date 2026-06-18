'use client';
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Line, LineChart, ResponsiveContainer,
  Tooltip, XAxis, YAxis,
} from 'recharts';

import { Shell } from '@/components/Shell';
import { Card, Loading, SectionTitle } from '@/components/ui';
import { getAnalytics } from '@/lib/api';
import { clockTime, fmtInt, fmtMoneyFull, fmtNum } from '@/lib/format';
import { useLive } from '@/lib/useLive';

const AXIS = { fontSize: 10, fill: '#64748b' };
const TIP = { background: '#0d1320', border: '1px solid #1e293b', borderRadius: 8, fontSize: 12 };
const REGION_COLORS = ['#6366f1', '#22d3ee', '#34d399', '#fbbf24', '#f87171'];

export default function AnalyticsPage() {
  const { data } = useLive('analytics', getAnalytics, 5000);
  if (!data) return <Shell><Loading /></Shell>;

  const regionData = data.regions.map((r) => ({ code: r.code, ccu: r.ccu }));

  return (
    <Shell>
      <div className="space-y-6">
        <div>
          <h1 className="text-xl font-bold">Analytics &amp; Reporting</h1>
          <p className="text-sm text-slate-500">Player demand, revenue &amp; performance — persisted KPI history</p>
        </div>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          <Card className="p-4">
            <SectionTitle>Concurrent Users</SectionTitle>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={data.series}>
                <defs>
                  <linearGradient id="a1" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#6366f1" stopOpacity={0.45} />
                    <stop offset="100%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis dataKey="ts" tickFormatter={(t) => clockTime(t).slice(0, 5)} tick={AXIS} minTickGap={48} />
                <YAxis tickFormatter={(v) => fmtNum(v as number)} tick={AXIS} width={42} />
                <Tooltip contentStyle={TIP} labelFormatter={(t) => clockTime(t as number)} formatter={(v) => [fmtInt(v as number), 'CCU']} />
                <Area type="monotone" dataKey="ccu" stroke="#6366f1" strokeWidth={2} fill="url(#a1)" isAnimationActive={false} />
              </AreaChart>
            </ResponsiveContainer>
          </Card>

          <Card className="p-4">
            <SectionTitle>Revenue (cumulative, today)</SectionTitle>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={data.series}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis dataKey="ts" tickFormatter={(t) => clockTime(t).slice(0, 5)} tick={AXIS} minTickGap={48} />
                <YAxis tickFormatter={(v) => fmtNum(v as number)} tick={AXIS} width={48} />
                <Tooltip contentStyle={TIP} labelFormatter={(t) => clockTime(t as number)} formatter={(v) => [fmtMoneyFull(v as number), 'Revenue']} />
                <Line type="monotone" dataKey="revenue" stroke="#34d399" strokeWidth={2} dot={false} isAnimationActive={false} />
              </LineChart>
            </ResponsiveContainer>
          </Card>

          <Card className="p-4">
            <SectionTitle>Average Latency (ms)</SectionTitle>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={data.series}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis dataKey="ts" tickFormatter={(t) => clockTime(t).slice(0, 5)} tick={AXIS} minTickGap={48} />
                <YAxis tick={AXIS} width={36} domain={[0, 'dataMax + 10']} />
                <Tooltip contentStyle={TIP} labelFormatter={(t) => clockTime(t as number)} formatter={(v) => [`${(v as number).toFixed(1)} ms`, 'Latency']} />
                <Line type="monotone" dataKey="avg_latency_ms" stroke="#fbbf24" strokeWidth={2} dot={false} isAnimationActive={false} />
              </LineChart>
            </ResponsiveContainer>
          </Card>

          <Card className="p-4">
            <SectionTitle>CCU by Region</SectionTitle>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={regionData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis dataKey="code" tick={AXIS} />
                <YAxis tickFormatter={(v) => fmtNum(v as number)} tick={AXIS} width={42} />
                <Tooltip contentStyle={TIP} formatter={(v) => [fmtInt(v as number), 'CCU']} cursor={{ fill: '#ffffff08' }} />
                <Bar dataKey="ccu" radius={[4, 4, 0, 0]}>
                  {regionData.map((_, i) => (
                    <Cell key={i} fill={REGION_COLORS[i % REGION_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </div>
      </div>
    </Shell>
  );
}
