// In-browser GameCloud simulation — the exact mirror of backend/simulation.py + the DB.
// When NEXT_PUBLIC_API_URL is unset (e.g. the free Vercel deploy), the whole console runs
// off this singleton: live KPIs, regions/fleets, RBAC login, workflow approvals, alerts,
// audit. Identical surface to the FastAPI backend so the two modes are indistinguishable.
import {
  Alert, Analytics, Audit, Exec, Fleet, Kpi, Region, Snapshot, User, Workflow,
} from './types';

const SEED_PASSWORD = 'gamecloud123';

const USERS: Record<string, { password: string; user: User }> = {
  admin: { password: SEED_PASSWORD, user: { username: 'admin', role: 'admin', name: 'Anshuman Atrey' } },
  manager: { password: SEED_PASSWORD, user: { username: 'manager', role: 'manager', name: 'Ops Manager' } },
  ops: { password: SEED_PASSWORD, user: { username: 'ops', role: 'ops', name: 'NOC Operator' } },
};

const REGION_DEFS = [
  { code: 'us-east-1', name: 'US East (N. Virginia)', city: 'Ashburn', base: 42000 },
  { code: 'eu-west-1', name: 'EU West (Ireland)', city: 'Dublin', base: 31000 },
  { code: 'ap-south-1', name: 'Asia Pacific (Mumbai)', city: 'Mumbai', base: 38000 },
  { code: 'ap-southeast-1', name: 'Asia Pacific (Singapore)', city: 'Singapore', base: 24000 },
  { code: 'sa-east-1', name: 'South America (São Paulo)', city: 'São Paulo', base: 16000 },
];

const FLEET_DEFS = [
  { id: 'flt-use1-br', region: 'us-east-1', name: 'battle-royale-prod', instance: 'c6g.4xlarge', cap: 30000 },
  { id: 'flt-use1-tdm', region: 'us-east-1', name: 'team-deathmatch-prod', instance: 'c6gn.2xlarge', cap: 18000 },
  { id: 'flt-euw1-br', region: 'eu-west-1', name: 'battle-royale-prod', instance: 'c6g.4xlarge', cap: 22000 },
  { id: 'flt-euw1-rk', region: 'eu-west-1', name: 'ranked-ladder-prod', instance: 'c6g.2xlarge', cap: 12000 },
  { id: 'flt-aps1-br', region: 'ap-south-1', name: 'battle-royale-prod', instance: 'c6g.4xlarge', cap: 26000 },
  { id: 'flt-aps1-cas', region: 'ap-south-1', name: 'casual-prod', instance: 'c6g.2xlarge', cap: 14000 },
  { id: 'flt-apse1-br', region: 'ap-southeast-1', name: 'battle-royale-prod', instance: 'c6g.2xlarge', cap: 16000 },
  { id: 'flt-apse1-rk', region: 'ap-southeast-1', name: 'ranked-ladder-prod', instance: 'c6g.xlarge', cap: 9000 },
  { id: 'flt-sae1-br', region: 'sa-east-1', name: 'battle-royale-prod', instance: 'c6g.2xlarge', cap: 11000 },
  { id: 'flt-sae1-cas', region: 'sa-east-1', name: 'casual-prod', instance: 'c6g.xlarge', cap: 6000 },
];

const HOUR = 3600_000;
const rand = (a: number, b: number) => a + Math.random() * (b - a);
const gauss = (mean: number, sd: number) => {
  const u = 1 - Math.random();
  const v = Math.random();
  return mean + sd * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
};

interface RegionState { code: string; name: string; city: string; base: number; ccu: number; status: string; }

class GameCloudSim {
  private static readonly HISTORY = 90;
  private start = Date.now();
  private regions: RegionState[];
  private fleets: Fleet[];
  private byRegion: Record<string, Fleet[]> = {};
  private history: Kpi[] = [];
  private revenueToday = 184000;
  private sessionsToday = 1250000;
  private matchesToday = 980000;
  private peakCcu = 0;
  private workflows: Workflow[] = [];
  private alerts: Alert[] = [];
  private audit: Audit[] = [];
  private auditSeq = 1;

  constructor() {
    this.regions = REGION_DEFS.map((r) => ({ ...r, ccu: r.base, status: 'healthy' }));
    this.fleets = FLEET_DEFS.map((f) => ({
      id: f.id, region_code: f.region, name: f.name, instance_type: f.instance,
      status: 'active', desired: 1, active: 1, max_cap: f.cap, ccu: 0, cpu_pct: 0, mem_pct: 0,
    }));
    this.fleets.forEach((f) => {
      (this.byRegion[f.region_code] ||= []).push(f);
    });
    for (let i = 0; i < GameCloudSim.HISTORY; i++) this.advance(true);
    const now = Date.now();
    const n = this.history.length;
    this.history.forEach((p, i) => (p.ts = now - (n - 1 - i) * 1000));
    this.seedRecords();
  }

  private diurnal(offset: number): number {
    const phase = (Date.now() - this.start) / 600_000;
    return 0.82 + 0.18 * Math.sin(phase * 2 * Math.PI + offset);
  }

  private advance(prime = false): void {
    let total = 0;
    this.regions.forEach((r, i) => {
      if (r.status === 'offline') { r.ccu = 0; return; }
      const health = r.status === 'degraded' ? 0.55 : 1;
      r.ccu = Math.round(r.base * this.diurnal(i * 1.1) * rand(0.97, 1.03) * health);
      total += r.ccu;
    });
    this.regions.forEach((r) => {
      const rf = this.byRegion[r.code] || [];
      const share = r.ccu / Math.max(rf.length, 1);
      rf.forEach((f) => {
        f.ccu = Math.round(share * rand(0.9, 1.1));
        const util = f.max_cap ? f.ccu / f.max_cap : 0;
        f.cpu_pct = Math.round(Math.min(99, util * 92 + rand(-4, 6)) * 10) / 10;
        f.mem_pct = Math.round(Math.min(98, util * 80 + rand(0, 10)) * 10) / 10;
        if (r.status === 'offline') { f.status = 'offline'; f.active = 0; }
        else if (util > 0.82) { f.status = 'scaling'; f.desired = Math.min(f.active + 1, 12); f.active = Math.max(1, f.active); }
        else { f.status = 'active'; f.active = Math.max(1, f.active); f.desired = f.active; }
      });
    });
    const sessions = Math.round(total / 6.2);
    const matches = Math.round(sessions / 4.5);
    const latency = Math.round((28 + (total / 200000) * 30 + rand(-2, 4)) * 10) / 10;
    const error = Math.round(Math.max(0, gauss(0.4, 0.28)) * 100) / 100;
    this.revenueToday += total * 0.0000085;
    this.sessionsToday += Math.max(0, Math.floor(sessions / 60));
    this.matchesToday += Math.max(0, Math.floor(matches / 60));
    this.peakCcu = Math.max(this.peakCcu, total);
    this.history.push({
      ts: Date.now(), ccu: total, sessions, matches_per_min: matches,
      revenue: Math.round(this.revenueToday * 100) / 100, avg_latency_ms: latency, error_rate: error,
    });
    if (this.history.length > GameCloudSim.HISTORY) this.history.shift();
    if (!prime) this.maybeAlert(latency, error);
  }

  private maybeAlert(latency: number, error: number): void {
    const roll = Math.random();
    if (error > 1.1 && roll < 0.05) this.raise('critical', 'error-budget', `Error rate spike ${error.toFixed(1)}% — SLO at risk`);
    else if (latency > 52 && roll < 0.05) this.raise('warning', 'latency-monitor', `Elevated P95 latency ${latency.toFixed(0)}ms across fleets`);
    else if (roll < 0.012) {
      const live = this.fleets.filter((f) => f.status !== 'offline');
      const f = (live.length ? live : this.fleets)[Math.floor(Math.random() * (live.length || this.fleets.length))];
      this.raise('info', f.name, `Fleet auto-scaled (CPU ${f.cpu_pct.toFixed(0)}%) in ${f.region_code}`);
    }
  }

  private raise(severity: string, source: string, message: string): void {
    this.alerts.unshift({ id: `al-${Math.random().toString(36).slice(2, 10)}`, severity, source, message, status: 'active', created_at: Date.now(), resolved_at: null });
    if (this.alerts.length > 120) this.alerts.pop();
  }

  private log(actor: string, action: string, entity: string, detail: string): void {
    this.audit.unshift({ id: this.auditSeq++, actor, action, entity, detail, created_at: Date.now() });
    if (this.audit.length > 200) this.audit.pop();
  }

  private seedRecords(): void {
    const now = Date.now();
    const wf: Omit<Workflow, 'id' | 'created_at' | 'decided_at'>[] = [
      { type: 'region_expansion', title: 'Provision new region: me-central-1 (UAE)', detail: 'Expand to Middle East for the MENA esports league; est. 18k peak CCU.', requested_by: 'manager', status: 'pending', amount: 42000, region_code: 'me-central-1' },
      { type: 'fleet_provision', title: 'Add battle-royale fleet in ap-south-1', detail: 'Mumbai peak sustained at 86% capacity; add one c6g.4xlarge fleet.', requested_by: 'ops', status: 'pending', amount: 9800, region_code: 'ap-south-1' },
      { type: 'maintenance', title: 'Rolling MySQL minor-version upgrade (RDS Multi-AZ)', detail: '8.0.35 → 8.0.39 across primary + standby, off-peak 02:00–04:00 UTC.', requested_by: 'ops', status: 'pending', amount: null, region_code: null },
      { type: 'tournament', title: 'Reserve burst capacity: Summer Invitational finals', detail: 'Burst +40k CCU for 6h across us-east-1 + eu-west-1.', requested_by: 'manager', status: 'approved', approver: 'admin', amount: 15000, region_code: 'us-east-1' },
      { type: 'refund', title: 'Bulk goodwill credit: matchmaking outage 06/12', detail: '2,140 affected players, in-game currency credit.', requested_by: 'ops', status: 'rejected', approver: 'manager', amount: 3200, region_code: null },
    ];
    wf.forEach((w, i) => {
      const created = now - (wf.length - i) * HOUR;
      this.workflows.push({ ...w, id: `wf-${Math.random().toString(36).slice(2, 10)}`, created_at: created, decided_at: w.status !== 'pending' ? created + HOUR / 2 : null });
    });
    const seedAlerts = [
      { severity: 'warning', source: 'ap-south-1', message: 'Mumbai fleet capacity at 86% — auto-scale armed', status: 'active' },
      { severity: 'critical', source: 'matchmaking', message: 'FlexMatch P99 ticket time > 45s in sa-east-1', status: 'ack' },
      { severity: 'info', source: 'battle-royale-prod', message: 'Fleet scaled 3 → 4 instances in us-east-1', status: 'resolved' },
    ];
    seedAlerts.forEach((a, i) => {
      const created = now - (seedAlerts.length - i) * 900_000;
      this.alerts.push({ ...a, id: `al-${Math.random().toString(36).slice(2, 10)}`, created_at: created, resolved_at: a.status === 'resolved' ? created + 600_000 : null });
    });
    this.log('system', 'bootstrap', 'platform', 'GameCloud control plane initialized; seed data loaded.');
  }

  // ── public surface (mirrors the API) ───────────────────────────────────────
  login(username: string, password: string): { token: string; user: User } | null {
    const rec = USERS[username];
    if (!rec || rec.password !== password) return null;
    this.log(username, 'login', 'auth', `${rec.user.role} signed in`);
    return { token: `sim.${username}.${rec.user.role}`, user: rec.user };
  }

  private regionViews(): Region[] {
    return this.regions.map((r) => {
      const rf = this.byRegion[r.code] || [];
      const cap = rf.reduce((s, f) => s + f.max_cap, 0) || 1;
      return { code: r.code, name: r.name, city: r.city, status: r.status, ccu: r.ccu, fleets: rf.length, capacity_pct: Math.round(Math.min(100, (r.ccu / cap) * 100) * 10) / 10 };
    });
  }

  private fleetSummary() {
    return {
      total: this.fleets.length,
      active: this.fleets.filter((f) => f.status === 'active').length,
      scaling: this.fleets.filter((f) => f.status === 'scaling').length,
      offline: this.fleets.filter((f) => f.status === 'offline').length,
      total_capacity: this.fleets.reduce((s, f) => s + f.max_cap, 0),
    };
  }

  snapshot(): Snapshot {
    this.advance();
    return {
      ts: Date.now(), company: 'GameCloud', kpis: this.history[this.history.length - 1],
      history: [...this.history], regions: this.regionViews(), fleet_summary: this.fleetSummary(),
      alerts_active: this.alerts.filter((a) => a.status === 'active').length,
      workflows_pending: this.workflows.filter((w) => w.status === 'pending').length,
    };
  }

  getRegions(): Region[] { return this.regionViews(); }
  getFleets(): Fleet[] { return this.fleets.map((f) => ({ ...f })); }

  analytics(): Analytics {
    return { series: [...this.history], regions: this.regionViews(), fleet_summary: this.fleetSummary() };
  }

  listWorkflows(): Workflow[] { return [...this.workflows].sort((a, b) => b.created_at - a.created_at); }

  createWorkflow(user: User, body: { type: string; title: string; detail?: string; amount?: number | null; region_code?: string | null }): Workflow {
    const w: Workflow = { id: `wf-${Math.random().toString(36).slice(2, 10)}`, type: body.type, title: body.title, detail: body.detail || '', requested_by: user.username, status: 'pending', approver: null, amount: body.amount ?? null, region_code: body.region_code ?? null, created_at: Date.now(), decided_at: null };
    this.workflows.unshift(w);
    this.log(user.username, 'request', 'workflow', `${body.type}: ${body.title}`);
    return w;
  }

  decideWorkflow(user: User, id: string, decision: 'approved' | 'rejected'): Workflow {
    const w = this.workflows.find((x) => x.id === id);
    if (!w) throw new Error('workflow not found');
    if (w.status !== 'pending') throw new Error(`already ${w.status}`);
    w.status = decision; w.approver = user.username; w.decided_at = Date.now();
    this.log(user.username, decision, 'workflow', `${w.type}: ${w.title}`);
    return w;
  }

  listAlerts(status?: string): Alert[] {
    return this.alerts.filter((a) => !status || a.status === status).slice(0, 100);
  }

  updateAlert(user: User, id: string, action: 'ack' | 'resolve'): Alert {
    const a = this.alerts.find((x) => x.id === id);
    if (!a) throw new Error('alert not found');
    a.status = action === 'ack' ? 'ack' : 'resolved';
    if (action === 'resolve') a.resolved_at = Date.now();
    this.log(user.username, action, 'alert', a.message);
    return a;
  }

  listAudit(): Audit[] { return [...this.audit].slice(0, 200); }

  chaos(user: User, code: string, action: 'degrade' | 'offline' | 'restore'): string {
    if (action === 'restore') { this.regions.forEach((r) => (r.status = 'healthy')); this.log(user.username, 'chaos:restore', 'region', code); return 'all regions restored to healthy'; }
    const r = this.regions.find((x) => x.code === code);
    if (!r) return `unknown region ${code}`;
    r.status = action === 'degrade' ? 'degraded' : 'offline';
    this.raise(action === 'offline' ? 'critical' : 'warning', code, `Region ${action.toUpperCase()} (operator-induced DR drill)`);
    this.log(user.username, `chaos:${action}`, 'region', code);
    return `${code} set to ${r.status}`;
  }

  execSummary(): Exec {
    const k = this.history[this.history.length - 1];
    const regions = this.regionViews();
    const totalCap = this.fleets.reduce((s, f) => s + f.max_cap, 0) || 1;
    const activeRegions = this.regions.filter((r) => r.status !== 'offline').length;
    return {
      ts: k.ts, ccu: k.ccu, peak_ccu_24h: this.peakCcu,
      revenue_today: Math.round(this.revenueToday * 100) / 100, revenue_30d: Math.round(this.revenueToday * 28.5 * 100) / 100,
      sessions_today: this.sessionsToday, matches_today: this.matchesToday, avg_latency_ms: k.avg_latency_ms,
      uptime_pct: activeRegions === this.regions.length ? 99.95 : 99.2, active_regions: activeRegions,
      total_fleet_capacity: totalCap, capacity_utilization_pct: Math.round((k.ccu / totalCap) * 1000) / 10,
      region_breakdown: regions.map((r) => ({ code: r.code, name: r.name, ccu: r.ccu, status: r.status, capacity_pct: r.capacity_pct })),
    };
  }
}

// One singleton per browser tab (survives client-side nav, like the backend process).
export const sim = new GameCloudSim();
