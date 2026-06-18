// ─── Data layer ────────────────────────────────────────────────────────────
// One seam between the UI and its data source:
//   • NEXT_PUBLIC_API_URL set  → talk to the FastAPI backend (real MySQL, RBAC).
//   • unset                    → the in-browser simulation (the Vercel deploy).
//   • backend set but down     → read endpoints fall back to the sim (degraded mode),
//                                which is exactly the "console survives a backend outage"
//                                disaster-recovery behaviour.
import { sim } from './sim';
import {
  Alert, Analytics, Audit, DataSource, Exec, Fleet, Region, Snapshot, User, Workflow,
} from './types';

const API = (process.env.NEXT_PUBLIC_API_URL || '').replace(/\/$/, '');

export const hasBackend = (): boolean => API !== '';
export const dataSource = (): DataSource => (API ? 'backend' : 'simulation');

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

let _token: string | null = null;
let _user: User | null = null;
export function setAuth(token: string | null, user: User | null) {
  _token = token;
  _user = user;
}

async function backend<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(_token ? { Authorization: `Bearer ${_token}` } : {}),
      ...(init?.headers || {}),
    },
    cache: 'no-store',
    signal: AbortSignal.timeout(6000),
  });
  if (!res.ok) {
    let detail = `HTTP ${res.status}`;
    try {
      const j = await res.json();
      detail = j.detail || detail;
    } catch {
      /* non-JSON error body */
    }
    throw new ApiError(res.status, detail);
  }
  return (await res.json()) as T;
}

// GET helper: real HTTP errors (401/403/…) propagate; network failures degrade to the sim.
async function getOrSim<T>(path: string, simFn: () => T): Promise<T> {
  if (!API) return simFn();
  try {
    return await backend<T>(path);
  } catch (e) {
    if (e instanceof ApiError) throw e;
    return simFn();
  }
}

function requireUser(): User {
  if (!_user) throw new ApiError(401, 'not authenticated');
  return _user;
}

// ── auth ─────────────────────────────────────────────────────────────────────
export async function login(username: string, password: string): Promise<{ token: string; user: User }> {
  if (API) {
    const r = await backend<{ access_token: string; user: User }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });
    return { token: r.access_token, user: r.user };
  }
  const r = sim.login(username, password);
  if (!r) throw new ApiError(401, 'invalid username or password');
  return r;
}

// ── reads ─────────────────────────────────────────────────────────────────────
export const getSnapshot = (): Promise<Snapshot> => getOrSim('/api/snapshot', () => sim.snapshot());
export const getRegions = (): Promise<Region[]> => getOrSim('/api/regions', () => sim.getRegions());
export const getFleets = (): Promise<Fleet[]> => getOrSim('/api/fleets', () => sim.getFleets());
export const getAnalytics = (): Promise<Analytics> => getOrSim('/api/analytics', () => sim.analytics());
export const getExec = (): Promise<Exec> => getOrSim('/api/exec', () => sim.execSummary());
export const getWorkflows = (): Promise<Workflow[]> => getOrSim('/api/workflows', () => sim.listWorkflows());
export const getAudit = (): Promise<Audit[]> => getOrSim('/api/audit', () => sim.listAudit());
export const getAlerts = (status?: string): Promise<Alert[]> =>
  getOrSim(`/api/alerts${status ? `?status=${status}` : ''}`, () => sim.listAlerts(status));

// ── mutations ─────────────────────────────────────────────────────────────────
export async function createWorkflow(body: {
  type: string; title: string; detail?: string; amount?: number | null; region_code?: string | null;
}): Promise<Workflow> {
  if (API) return backend('/api/workflows', { method: 'POST', body: JSON.stringify(body) });
  return sim.createWorkflow(requireUser(), body);
}

export async function decideWorkflow(id: string, decision: 'approved' | 'rejected'): Promise<Workflow> {
  if (API) return backend(`/api/workflows/${id}/decision?decision=${decision}`, { method: 'POST' });
  return sim.decideWorkflow(requireUser(), id, decision);
}

export async function updateAlert(id: string, action: 'ack' | 'resolve'): Promise<Alert> {
  if (API) return backend(`/api/alerts/${id}/${action}`, { method: 'POST' });
  return sim.updateAlert(requireUser(), id, action);
}

export async function chaos(code: string, action: 'degrade' | 'offline' | 'restore'): Promise<{ ok: boolean; detail: string }> {
  if (API) return backend(`/api/chaos/region/${code}/${action}`, { method: 'POST' });
  return { ok: true, detail: sim.chaos(requireUser(), code, action) };
}
