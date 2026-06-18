export type Role = 'admin' | 'manager' | 'ops';

export interface User {
  username: string;
  role: Role;
  name: string;
}

export interface Kpi {
  ts: number;
  ccu: number;
  sessions: number;
  matches_per_min: number;
  revenue: number;
  avg_latency_ms: number;
  error_rate: number;
}

export interface Region {
  code: string;
  name: string;
  city: string;
  status: string;
  ccu: number;
  fleets: number;
  capacity_pct: number;
}

export interface Fleet {
  id: string;
  region_code: string;
  name: string;
  instance_type: string;
  status: string;
  desired: number;
  active: number;
  max_cap: number;
  ccu: number;
  cpu_pct: number;
  mem_pct: number;
}

export interface FleetSummary {
  total: number;
  active: number;
  scaling: number;
  offline: number;
  total_capacity: number;
}

export interface Snapshot {
  ts: number;
  company: string;
  kpis: Kpi;
  history: Kpi[];
  regions: Region[];
  fleet_summary: FleetSummary;
  alerts_active: number;
  workflows_pending: number;
}

export interface Workflow {
  id: string;
  type: string;
  title: string;
  detail: string;
  requested_by: string;
  status: string;
  approver?: string | null;
  amount?: number | null;
  region_code?: string | null;
  created_at: number;
  decided_at?: number | null;
}

export interface Alert {
  id: string;
  severity: string;
  source: string;
  message: string;
  status: string;
  created_at: number;
  resolved_at?: number | null;
}

export interface Audit {
  id: number;
  actor: string;
  action: string;
  entity: string;
  detail: string;
  created_at: number;
}

export interface RegionBreakdown {
  code: string;
  name?: string;
  ccu: number;
  status: string;
  capacity_pct?: number;
}

export interface Exec {
  ts: number;
  ccu: number;
  peak_ccu_24h: number;
  revenue_today: number;
  revenue_30d: number;
  sessions_today: number;
  matches_today: number;
  avg_latency_ms: number;
  uptime_pct: number;
  active_regions: number;
  total_fleet_capacity: number;
  capacity_utilization_pct: number;
  region_breakdown: RegionBreakdown[];
}

export interface Analytics {
  series: Kpi[];
  regions: Region[];
  fleet_summary: FleetSummary;
}

export type DataSource = 'backend' | 'simulation';
