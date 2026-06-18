'use client';
import { ReactNode } from 'react';

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-xl border border-line bg-panel/70 ${className}`}>{children}</div>;
}

const TONE: Record<string, string> = {
  good: 'text-good bg-good/10 border-good/30',
  warn: 'text-warn bg-warn/10 border-warn/30',
  bad: 'text-bad bg-bad/10 border-bad/30',
  info: 'text-accent2 bg-accent2/10 border-accent2/30',
  muted: 'text-slate-400 bg-slate-500/10 border-slate-600/40',
};

export function toneFor(status: string): keyof typeof TONE {
  switch (status) {
    case 'healthy':
    case 'active':
    case 'approved':
    case 'resolved':
    case 'online':
      return 'good';
    case 'degraded':
    case 'scaling':
    case 'warning':
    case 'ack':
    case 'pending':
      return 'warn';
    case 'offline':
    case 'critical':
    case 'rejected':
      return 'bad';
    case 'info':
      return 'info';
    default:
      return 'muted';
  }
}

export function Pill({ status, label }: { status: string; label?: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide ${TONE[toneFor(status)]}`}
    >
      {label || status}
    </span>
  );
}

export function Bar({ pct }: { pct: number }) {
  const color = pct > 85 ? 'bg-bad' : pct > 70 ? 'bg-warn' : 'bg-good';
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-700/50">
      <div className={`h-full rounded-full ${color}`} style={{ width: `${Math.min(100, Math.max(0, pct))}%` }} />
    </div>
  );
}

export function KpiCard({
  label,
  value,
  sub,
  icon,
  accent = 'text-white',
}: {
  label: string;
  value: string;
  sub?: string;
  icon?: ReactNode;
  accent?: string;
}) {
  return (
    <Card className="p-4">
      <div className="flex items-center justify-between">
        <div className="text-[11px] uppercase tracking-wide text-slate-500">{label}</div>
        {icon && <div className="text-slate-600">{icon}</div>}
      </div>
      <div className={`mt-2 font-mono text-2xl font-bold ${accent}`}>{value}</div>
      {sub && <div className="mt-1 text-xs text-slate-500">{sub}</div>}
    </Card>
  );
}

export function SectionTitle({ children, right }: { children: ReactNode; right?: ReactNode }) {
  return (
    <div className="mb-3 flex items-center justify-between">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-300">{children}</h2>
      {right}
    </div>
  );
}

export function Loading({ label = 'Loading telemetry…' }: { label?: string }) {
  return (
    <div className="flex h-64 items-center justify-center gap-2 text-slate-500">
      <span className="h-2 w-2 rounded-full bg-accent live-dot" /> {label}
    </div>
  );
}
