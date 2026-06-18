"""Idempotent seeding — runs at startup, only inserts when a table is empty.
All demo users share settings.seed_password (admin / manager / ops)."""
import time
import uuid

from auth import hash_password
from config import settings
from database import SessionLocal
from db_models import Alert, AuditLog, Fleet, Region, User, Workflow
from seed_data import FLEETS, REGIONS, SEED_ALERTS, SEED_WORKFLOWS, USERS


def run():
    now = int(time.time() * 1000)
    pw = hash_password(settings.seed_password)
    with SessionLocal() as db:
        if db.query(User).count() == 0:
            for u in USERS:
                db.add(User(id=f"usr-{uuid.uuid4().hex[:8]}", username=u["username"],
                            email=u["email"], full_name=u["name"], password_hash=pw,
                            role=u["role"], created_at=now))

        if db.query(Region).count() == 0:
            for r in REGIONS:
                db.add(Region(id=f"reg-{uuid.uuid4().hex[:8]}", code=r["code"], name=r["name"],
                              city=r["city"], status="healthy", created_at=now))

        if db.query(Fleet).count() == 0:
            for f in FLEETS:
                db.add(Fleet(id=f["id"], region_code=f["region"], name=f["name"],
                             instance_type=f["instance"], status="active", desired=1, active=1,
                             max_cap=f["max_cap"], ccu=0, cpu_pct=0, mem_pct=0, created_at=now))

        if db.query(Workflow).count() == 0:
            for i, w in enumerate(SEED_WORKFLOWS):
                created = now - (len(SEED_WORKFLOWS) - i) * 3_600_000  # stagger over hours
                db.add(Workflow(
                    id=f"wf-{uuid.uuid4().hex[:8]}", type=w["type"], title=w["title"],
                    detail=w["detail"], requested_by=w["requested_by"], status=w["status"],
                    approver=w.get("approver"), amount=w.get("amount"),
                    region_code=w.get("region_code"), created_at=created,
                    decided_at=(created + 1_800_000) if w["status"] != "pending" else None))

        if db.query(Alert).count() == 0:
            for i, a in enumerate(SEED_ALERTS):
                created = now - (len(SEED_ALERTS) - i) * 900_000
                db.add(Alert(id=f"al-{uuid.uuid4().hex[:8]}", severity=a["severity"],
                             source=a["source"], message=a["message"], status=a["status"],
                             created_at=created,
                             resolved_at=(created + 600_000) if a["status"] == "resolved" else None))

        if db.query(AuditLog).count() == 0:
            db.add(AuditLog(actor="system", action="bootstrap", entity="platform",
                            detail="GameCloud control plane initialized; seed data loaded.",
                            created_at=now))
        db.commit()
