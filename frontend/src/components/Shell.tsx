'use client';
import {
  BarChart3, Bell, Crown, Gamepad2, GitPullRequest, Globe2, LayoutDashboard, LogOut, ScrollText,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { ReactNode, useEffect, useState } from 'react';

import { dataSource } from '@/lib/api';
import { canViewAudit, canViewExec, useAuth } from '@/lib/auth';

const NAV = [
  { href: '/', label: 'Overview', icon: LayoutDashboard },
  { href: '/regions', label: 'Regions & Fleets', icon: Globe2 },
  { href: '/analytics', label: 'Analytics', icon: BarChart3 },
  { href: '/workflows', label: 'Workflows', icon: GitPullRequest },
  { href: '/alerts', label: 'Alerts', icon: Bell },
  { href: '/audit', label: 'Audit Log', icon: ScrollText, gate: 'audit' },
  { href: '/executive', label: 'Executive', icon: Crown, gate: 'exec' },
] as const;

export function Shell({ children }: { children: ReactNode }) {
  const { user, ready, signOut } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [clock, setClock] = useState('');

  useEffect(() => {
    const tick = () =>
      setClock(new Date().toLocaleTimeString('en-US', { hour12: false, timeZone: 'UTC' }));
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (ready && !user) router.replace('/login');
  }, [ready, user, router]);

  if (!ready || !user) {
    return <div className="flex h-screen items-center justify-center text-slate-500">Loading…</div>;
  }

  const nav = NAV.filter((n) => {
    if ('gate' in n && n.gate === 'audit') return canViewAudit(user.role);
    if ('gate' in n && n.gate === 'exec') return canViewExec(user.role);
    return true;
  });
  const src = dataSource();

  return (
    <div className="flex min-h-screen">
      <aside className="hidden w-60 shrink-0 flex-col border-r border-line bg-panel/60 p-4 md:flex">
        <div className="mb-6 flex items-center gap-2">
          <div className="grid h-9 w-9 place-items-center rounded-lg bg-accent/20 text-accent">
            <Gamepad2 size={20} />
          </div>
          <div>
            <div className="font-bold leading-tight">GameCloud</div>
            <div className="text-[10px] uppercase tracking-widest text-slate-500">Ops Console</div>
          </div>
        </div>

        <nav className="flex flex-col gap-1">
          {nav.map((n) => {
            const active = pathname === n.href;
            const Icon = n.icon;
            return (
              <Link
                key={n.href}
                href={n.href}
                className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
                  active ? 'bg-accent/15 text-white' : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
                }`}
              >
                <Icon size={16} />
                {n.label}
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto space-y-3 pt-4 text-xs">
          <div
            className={`flex items-center gap-2 rounded-lg border px-3 py-2 ${
              src === 'backend' ? 'border-good/30 text-good' : 'border-accent2/30 text-accent2'
            }`}
          >
            <span className={`h-2 w-2 rounded-full live-dot ${src === 'backend' ? 'bg-good' : 'bg-accent2'}`} />
            {src === 'backend' ? 'Live backend' : 'Simulation mode'}
          </div>
          <button
            onClick={signOut}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-slate-400 hover:bg-white/5 hover:text-slate-200"
          >
            <LogOut size={15} /> Sign out
          </button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-line bg-panel/40 px-6 py-3">
          <div className="text-sm text-slate-400">Global Online Gaming &amp; Esports Operations</div>
          <div className="flex items-center gap-4">
            <span className="font-mono text-xs text-slate-500">{clock} UTC</span>
            <div className="flex items-center gap-2">
              <div className="text-right">
                <div className="text-sm font-medium leading-tight">{user.name}</div>
                <div className="text-[10px] uppercase tracking-wide text-accent">{user.role}</div>
              </div>
              <div className="grid h-8 w-8 place-items-center rounded-full bg-accent/20 text-xs font-bold uppercase text-accent">
                {user.name.slice(0, 1)}
              </div>
            </div>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}
