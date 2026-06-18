'use client';
import { Gamepad2, ShieldCheck } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import { dataSource } from '@/lib/api';
import { useAuth } from '@/lib/auth';

const ROLES = [
  { username: 'admin', label: 'Administrator', desc: 'Full control · approve · DR drills' },
  { username: 'manager', label: 'Ops Manager', desc: 'Approve · analytics · exec portal' },
  { username: 'ops', label: 'NOC Operator', desc: 'Monitor · ack alerts · request' },
];

export default function LoginPage() {
  const { user, ready, signIn } = useAuth();
  const router = useRouter();
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('gamecloud123');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (ready && user) router.replace('/');
  }, [ready, user, router]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErr('');
    try {
      await signIn(username, password);
      router.replace('/');
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : 'login failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-screen">
      {/* brand panel */}
      <div className="relative hidden w-1/2 flex-col justify-between overflow-hidden border-r border-line p-12 lg:flex">
        <div className="flex items-center gap-3">
          <div className="grid h-11 w-11 place-items-center rounded-xl bg-accent/20 text-accent">
            <Gamepad2 size={24} />
          </div>
          <div>
            <div className="text-lg font-bold">GameCloud</div>
            <div className="text-[11px] uppercase tracking-widest text-slate-500">Operations Console</div>
          </div>
        </div>
        <div>
          <h1 className="text-4xl font-bold leading-tight">
            Run a global<br />
            <span className="text-accent">gaming platform</span><br />
            from one console.
          </h1>
          <p className="mt-4 max-w-md text-sm text-slate-400">
            Centralized visibility across regions and fleets — live KPIs, RBAC-gated approval
            workflows, alerting, audit, and executive reporting. Built on AWS.
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <ShieldCheck size={14} /> Role-based access · audited operations · multi-region
        </div>
      </div>

      {/* form */}
      <div className="flex w-full flex-col items-center justify-center p-8 lg:w-1/2">
        <form onSubmit={submit} className="w-full max-w-sm">
          <div className="mb-6">
            <h2 className="text-2xl font-bold">Sign in</h2>
            <p className="mt-1 text-sm text-slate-500">Select a role to explore the console.</p>
          </div>

          <div className="mb-5 grid grid-cols-1 gap-2">
            {ROLES.map((r) => (
              <button
                type="button"
                key={r.username}
                onClick={() => setUsername(r.username)}
                className={`rounded-lg border px-3 py-2 text-left transition-colors ${
                  username === r.username
                    ? 'border-accent/60 bg-accent/10'
                    : 'border-line bg-panel/50 hover:border-slate-600'
                }`}
              >
                <div className="text-sm font-medium">{r.label}</div>
                <div className="text-[11px] text-slate-500">{r.desc}</div>
              </button>
            ))}
          </div>

          <label className="mb-1 block text-xs uppercase tracking-wide text-slate-500">Username</label>
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="mb-3 w-full rounded-lg border border-line bg-ink px-3 py-2 text-sm outline-none focus:border-accent"
          />
          <label className="mb-1 block text-xs uppercase tracking-wide text-slate-500">Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mb-4 w-full rounded-lg border border-line bg-ink px-3 py-2 text-sm outline-none focus:border-accent"
          />

          {err && <div className="mb-3 rounded-lg border border-bad/30 bg-bad/10 px-3 py-2 text-xs text-bad">{err}</div>}

          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-lg bg-accent py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {busy ? 'Signing in…' : 'Sign in'}
          </button>

          <div className="mt-4 text-center text-[11px] text-slate-600">
            demo credentials · admin / manager / ops · password <span className="font-mono">gamecloud123</span>
            <div className="mt-1">
              data source: <span className="text-accent2">{dataSource()}</span>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
