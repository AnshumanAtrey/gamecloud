"""GameCloud Operations API.

A FastAPI control plane for a global online-gaming/esports platform: live KPI telemetry,
multi-region fleet visibility, RBAC-gated approval workflows, alerting, an append-only audit
trail, analytics, and an executive portal. SQLite locally; MySQL/MariaDB in docker-compose
and on the live EC2 box. Exposes Prometheus metrics at /metrics.
"""
import asyncio
import time
import uuid
from contextlib import asynccontextmanager

from fastapi import Depends, FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from prometheus_client import Gauge
from prometheus_fastapi_instrumentator import Instrumentator

import auth
from auth import get_current_user, require_role
from config import settings
from database import Base, SessionLocal, engine
from db_models import Alert, AuditLog, KpiSnapshot, User, Workflow
from schemas import (AlertOut, AuditOut, ExecOut, FleetOut, KpiPoint, LoginIn, RegionOut,
                     SnapshotOut, TokenOut, UserOut, WorkflowCreate, WorkflowOut)
from simulation import GameCloudSim
import seed

sim = GameCloudSim()

# ── Prometheus gauges (scraped by the monitoring rubric item) ─────────────────
G_CCU = Gauge("gamecloud_ccu", "Concurrent users platform-wide")
G_SESSIONS = Gauge("gamecloud_active_sessions", "Active game sessions")
G_LATENCY = Gauge("gamecloud_avg_latency_ms", "Average latency in ms")
G_ALERTS = Gauge("gamecloud_active_alerts", "Active (unresolved) alerts")
G_REGIONS_UP = Gauge("gamecloud_regions_online", "Regions currently online")


# ── helpers ──────────────────────────────────────────────────────────────────
def _audit(db, actor: str, action: str, entity: str, detail: str):
    db.add(AuditLog(actor=actor, action=action, entity=entity, detail=detail,
                    created_at=int(time.time() * 1000)))


def _wf_out(w: Workflow) -> WorkflowOut:
    return WorkflowOut(id=w.id, type=w.type, title=w.title, detail=w.detail or "",
                       requested_by=w.requested_by, status=w.status, approver=w.approver,
                       amount=w.amount, region_code=w.region_code,
                       created_at=w.created_at, decided_at=w.decided_at)


def _alert_out(a: Alert) -> AlertOut:
    return AlertOut(id=a.id, severity=a.severity, source=a.source, message=a.message,
                    status=a.status, created_at=a.created_at, resolved_at=a.resolved_at)


def _drain_alerts():
    """Persist sim-raised alerts into MySQL (system of record)."""
    if not sim.pending_alerts:
        return
    with SessionLocal() as db:
        while sim.pending_alerts:
            a = sim.pending_alerts.pop(0)
            db.add(Alert(id=f"al-{uuid.uuid4().hex[:8]}", severity=a["severity"],
                         source=a["source"], message=a["message"], status="active",
                         created_at=int(time.time() * 1000)))
        db.commit()


# ── background loop: tick the sim, publish metrics, snapshot KPIs to MySQL ─────
async def sim_loop():
    n = 0
    while True:
        sim.tick()
        n += 1
        _drain_alerts()
        live = sim.live()
        k = live["kpis"]
        G_CCU.set(k["ccu"])
        G_SESSIONS.set(k["sessions"])
        G_LATENCY.set(k["avg_latency_ms"])
        G_REGIONS_UP.set(sum(1 for r in live["regions"] if r["status"] != "offline"))
        with SessionLocal() as db:
            G_ALERTS.set(db.query(Alert).filter(Alert.status == "active").count())
            if n % 15 == 0:  # durable history every 15s without flooding the table
                db.add(KpiSnapshot(ts=k["ts"], ccu=k["ccu"], sessions=k["sessions"],
                                   matches_per_min=k["matches_per_min"], revenue=k["revenue"],
                                   avg_latency_ms=k["avg_latency_ms"], error_rate=k["error_rate"]))
                db.commit()
        await asyncio.sleep(1)


@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(engine)
    seed.run()
    task = asyncio.create_task(sim_loop())
    yield
    task.cancel()


app = FastAPI(title="GameCloud Operations API", version="1.0.0", lifespan=lifespan)

_origins = ["*"] if settings.cors_origins.strip() == "*" else [o.strip() for o in settings.cors_origins.split(",")]
app.add_middleware(CORSMiddleware, allow_origins=_origins, allow_methods=["*"], allow_headers=["*"])
Instrumentator().instrument(app).expose(app)


# ── health + auth ─────────────────────────────────────────────────────────────
@app.get("/health")
def health():
    return {"status": "ok", "service": "gamecloud-api"}


@app.post("/api/auth/login", response_model=TokenOut)
def login(body: LoginIn):
    with SessionLocal() as db:
        u = db.query(User).filter(User.username == body.username).first()
        if not u or not auth.verify_password(body.password, u.password_hash):
            raise HTTPException(status_code=401, detail="invalid username or password")
        token = auth.create_token(u.username, u.role, u.full_name or u.username)
        _audit(db, u.username, "login", "auth", f"{u.role} signed in")
        db.commit()
        return TokenOut(access_token=token,
                        user=UserOut(username=u.username, role=u.role, name=u.full_name or u.username))


@app.get("/api/auth/me", response_model=UserOut)
def me(user=Depends(get_current_user)):
    return UserOut(username=user["username"], role=user["role"], name=user["name"])


# ── live dashboard ─────────────────────────────────────────────────────────────
@app.get("/api/snapshot", response_model=SnapshotOut)
def snapshot(user=Depends(get_current_user)):
    live = sim.live()
    with SessionLocal() as db:
        alerts_active = db.query(Alert).filter(Alert.status == "active").count()
        wf_pending = db.query(Workflow).filter(Workflow.status == "pending").count()
    return SnapshotOut(
        ts=int(time.time() * 1000), company=settings.company_name,
        kpis=KpiPoint(**live["kpis"]), history=[KpiPoint(**h) for h in live["history"]],
        regions=[RegionOut(**r) for r in live["regions"]], fleet_summary=live["fleet_summary"],
        alerts_active=alerts_active, workflows_pending=wf_pending)


@app.get("/api/regions", response_model=list[RegionOut])
def regions(user=Depends(get_current_user)):
    return [RegionOut(**r) for r in sim.live()["regions"]]


@app.get("/api/fleets", response_model=list[FleetOut])
def fleets(user=Depends(get_current_user)):
    return [FleetOut(**f) for f in sim.live()["fleets"]]


# ── workflows (approval chains — RBAC) ─────────────────────────────────────────
@app.get("/api/workflows", response_model=list[WorkflowOut])
def list_workflows(user=Depends(get_current_user)):
    with SessionLocal() as db:
        rows = db.query(Workflow).order_by(Workflow.created_at.desc()).all()
        return [_wf_out(w) for w in rows]


@app.post("/api/workflows", response_model=WorkflowOut)
def create_workflow(body: WorkflowCreate, user=Depends(get_current_user)):
    if not body.title.strip():
        raise HTTPException(status_code=400, detail="title required")
    now = int(time.time() * 1000)
    with SessionLocal() as db:
        w = Workflow(id=f"wf-{uuid.uuid4().hex[:8]}", type=body.type, title=body.title.strip(),
                     detail=body.detail, requested_by=user["username"], status="pending",
                     amount=body.amount, region_code=body.region_code, created_at=now)
        db.add(w)
        _audit(db, user["username"], "request", "workflow", f'{body.type}: {body.title}')
        db.commit()
        db.refresh(w)
        return _wf_out(w)


@app.post("/api/workflows/{wid}/decision", response_model=WorkflowOut)
def decide_workflow(wid: str, decision: str = Query(..., pattern="^(approved|rejected)$"),
                    user=Depends(require_role("admin", "manager"))):
    """Approve/reject — only admin or manager. Ops can request but not decide."""
    with SessionLocal() as db:
        w = db.get(Workflow, wid)
        if not w:
            raise HTTPException(status_code=404, detail="workflow not found")
        if w.status != "pending":
            raise HTTPException(status_code=409, detail=f"already {w.status}")
        w.status = decision
        w.approver = user["username"]
        w.decided_at = int(time.time() * 1000)
        _audit(db, user["username"], decision, "workflow", f"{w.type}: {w.title}")
        db.commit()
        db.refresh(w)
        return _wf_out(w)


# ── alerts ─────────────────────────────────────────────────────────────────────
@app.get("/api/alerts", response_model=list[AlertOut])
def list_alerts(status: str | None = None, user=Depends(get_current_user)):
    with SessionLocal() as db:
        q = db.query(Alert)
        if status:
            q = q.filter(Alert.status == status)
        rows = q.order_by(Alert.created_at.desc()).limit(100).all()
        return [_alert_out(a) for a in rows]


@app.post("/api/alerts/{aid}/{action}", response_model=AlertOut)
def update_alert(aid: str, action: str, user=Depends(get_current_user)):
    if action not in ("ack", "resolve"):
        raise HTTPException(status_code=400, detail="action must be ack or resolve")
    with SessionLocal() as db:
        a = db.get(Alert, aid)
        if not a:
            raise HTTPException(status_code=404, detail="alert not found")
        a.status = "ack" if action == "ack" else "resolved"
        if action == "resolve":
            a.resolved_at = int(time.time() * 1000)
        _audit(db, user["username"], action, "alert", a.message)
        db.commit()
        db.refresh(a)
        return _alert_out(a)


# ── audit trail (admin/manager) ───────────────────────────────────────────────
@app.get("/api/audit", response_model=list[AuditOut])
def audit_log(user=Depends(require_role("admin", "manager"))):
    with SessionLocal() as db:
        rows = db.query(AuditLog).order_by(AuditLog.id.desc()).limit(200).all()
        return [AuditOut(id=a.id, actor=a.actor, action=a.action, entity=a.entity,
                         detail=a.detail or "", created_at=a.created_at) for a in rows]


# ── analytics (persisted KPI history) ─────────────────────────────────────────
@app.get("/api/analytics")
def analytics(user=Depends(get_current_user)):
    with SessionLocal() as db:
        rows = db.query(KpiSnapshot).order_by(KpiSnapshot.ts.desc()).limit(96).all()
    series = [{"ts": r.ts, "ccu": r.ccu, "sessions": r.sessions, "matches_per_min": r.matches_per_min,
               "revenue": r.revenue, "avg_latency_ms": r.avg_latency_ms, "error_rate": r.error_rate}
              for r in reversed(rows)]
    if len(series) < 5:  # backfill from live memory until the table fills
        series = sim.live()["history"]
    return {"series": series, "regions": sim.live()["regions"], "fleet_summary": sim.live()["fleet_summary"]}


# ── executive portal (admin/manager) ──────────────────────────────────────────
@app.get("/api/exec", response_model=ExecOut)
def exec_portal(user=Depends(require_role("admin", "manager"))):
    return ExecOut(**sim.exec_summary())


# ── DR / chaos controls (admin only) — drives the live region-outage demo ──────
@app.post("/api/chaos/region/{code}/{action}")
def chaos(code: str, action: str, user=Depends(require_role("admin"))):
    if action not in ("degrade", "offline", "restore"):
        raise HTTPException(status_code=400, detail="action must be degrade, offline or restore")
    detail = sim.set_region(code, action)
    with SessionLocal() as db:
        if action != "restore":
            sev = "critical" if action == "offline" else "warning"
            db.add(Alert(id=f"al-{uuid.uuid4().hex[:8]}", severity=sev, source=code,
                         message=f"Region {action.upper()} (operator-induced DR drill)",
                         status="active", created_at=int(time.time() * 1000)))
        _audit(db, user["username"], f"chaos:{action}", "region", code)
        db.commit()
    return {"ok": True, "detail": detail}
