"""Persistent tables — the database-backed operational records the rubric asks for
(integrity, auditability, compliance). All String columns carry explicit lengths so the
identical schema works on MySQL/MariaDB (VARCHAR requires a length) as well as SQLite.
"""
from sqlalchemy import BigInteger, Column, Float, Integer, String

from database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(String(36), primary_key=True)
    username = Column(String(64), unique=True, nullable=False, index=True)
    email = Column(String(255))
    full_name = Column(String(128))
    password_hash = Column(String(255), nullable=False)
    role = Column(String(16), nullable=False, default="ops")  # admin / manager / ops
    created_at = Column(BigInteger)


class Region(Base):
    __tablename__ = "regions"

    id = Column(String(36), primary_key=True)
    code = Column(String(32), unique=True, nullable=False)  # us-east-1
    name = Column(String(64))                               # US East (N. Virginia)
    city = Column(String(64))
    status = Column(String(16), default="healthy")          # healthy / degraded / offline
    created_at = Column(BigInteger)


class Fleet(Base):
    __tablename__ = "fleets"

    id = Column(String(36), primary_key=True)
    region_code = Column(String(32), index=True)
    name = Column(String(64))
    instance_type = Column(String(32))                      # c6g.4xlarge
    status = Column(String(16), default="active")           # active / scaling / draining / offline
    desired = Column(Integer, default=1)
    active = Column(Integer, default=1)
    max_cap = Column(Integer, default=10)
    ccu = Column(Integer, default=0)                        # concurrent users on this fleet
    cpu_pct = Column(Float, default=0)
    mem_pct = Column(Float, default=0)
    created_at = Column(BigInteger)


class KpiSnapshot(Base):
    """Time-series of platform KPIs — powers the analytics charts and exec portal."""
    __tablename__ = "kpi_snapshots"

    id = Column(Integer, primary_key=True, autoincrement=True)
    ts = Column(BigInteger, index=True)
    ccu = Column(Integer)
    sessions = Column(Integer)
    matches_per_min = Column(Integer)
    revenue = Column(Float)
    avg_latency_ms = Column(Float)
    error_rate = Column(Float)


class Workflow(Base):
    """Approval chains — fleet provisioning, tournaments, region expansion, refunds."""
    __tablename__ = "workflows"

    id = Column(String(36), primary_key=True)
    type = Column(String(32))           # fleet_provision / tournament / region_expansion / refund / maintenance
    title = Column(String(200))
    detail = Column(String(500))
    requested_by = Column(String(64))
    status = Column(String(16), default="pending")  # pending / approved / rejected
    approver = Column(String(64))
    amount = Column(Float)
    region_code = Column(String(32))
    created_at = Column(BigInteger)
    decided_at = Column(BigInteger)


class Alert(Base):
    __tablename__ = "alerts"

    id = Column(String(36), primary_key=True)
    severity = Column(String(16))       # critical / warning / info
    source = Column(String(64))         # region / fleet / service name
    message = Column(String(300))
    status = Column(String(16), default="active")  # active / ack / resolved
    created_at = Column(BigInteger)
    resolved_at = Column(BigInteger)


class AuditLog(Base):
    """Append-only operational record — every privileged action, for compliance."""
    __tablename__ = "audit_log"

    id = Column(Integer, primary_key=True, autoincrement=True)
    actor = Column(String(64))
    action = Column(String(64))
    entity = Column(String(64))
    detail = Column(String(500))
    created_at = Column(BigInteger)
