"""Pydantic request/response models."""
from typing import List, Optional

from pydantic import BaseModel


# ── auth ─────────────────────────────────────────────────────────────────────
class LoginIn(BaseModel):
    username: str
    password: str


class UserOut(BaseModel):
    username: str
    role: str
    name: str


class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut


# ── operational entities ─────────────────────────────────────────────────────
class RegionOut(BaseModel):
    code: str
    name: str
    city: str
    status: str
    ccu: int
    fleets: int
    capacity_pct: float


class FleetOut(BaseModel):
    id: str
    region_code: str
    name: str
    instance_type: str
    status: str
    desired: int
    active: int
    max_cap: int
    ccu: int
    cpu_pct: float
    mem_pct: float


class KpiPoint(BaseModel):
    ts: int
    ccu: int
    sessions: int
    matches_per_min: int
    revenue: float
    avg_latency_ms: float
    error_rate: float


class WorkflowOut(BaseModel):
    id: str
    type: str
    title: str
    detail: str
    requested_by: str
    status: str
    approver: Optional[str] = None
    amount: Optional[float] = None
    region_code: Optional[str] = None
    created_at: int
    decided_at: Optional[int] = None


class WorkflowCreate(BaseModel):
    type: str
    title: str
    detail: str = ""
    amount: Optional[float] = None
    region_code: Optional[str] = None


class AlertOut(BaseModel):
    id: str
    severity: str
    source: str
    message: str
    status: str
    created_at: int
    resolved_at: Optional[int] = None


class AuditOut(BaseModel):
    id: int
    actor: str
    action: str
    entity: str
    detail: str
    created_at: int


# ── the dashboard payload ────────────────────────────────────────────────────
class SnapshotOut(BaseModel):
    ts: int
    company: str
    kpis: KpiPoint
    history: List[KpiPoint]
    regions: List[RegionOut]
    fleet_summary: dict
    alerts_active: int
    workflows_pending: int


class ExecOut(BaseModel):
    """Aggregated leadership view — executive reporting portal."""
    ts: int
    ccu: int
    peak_ccu_24h: int
    revenue_today: float
    revenue_30d: float
    sessions_today: int
    matches_today: int
    avg_latency_ms: float
    uptime_pct: float
    active_regions: int
    total_fleet_capacity: int
    capacity_utilization_pct: float
    region_breakdown: List[dict]
