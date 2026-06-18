# GameCloud — Online Gaming & Esports Operations Platform

> **AWS Case Study 83** · B.Tech CSE Sem IV · ITM Skills University · Anshuman Atrey
> A scalable, highly-available, multi-region **cloud operations platform** for an online-gaming /
> esports company — built to run on AWS, with the hands-on cloud layer demonstrated live on a real
> free-tier EC2 host.

GameCloud is **not a game** — it's the platform a gaming company runs its global business on:
centralized real-time dashboards, role-based access, analytics & reporting, approval workflows,
monitoring & alerting, an audit trail, and multi-region expansion management.

---

## Architecture at a glance

```
EDGE/SECURITY   Route 53 · CloudFront · WAF + Shield · Cognito
IDENTITY/RBAC   Cognito → JWT (Admin / Manager / Ops) · IAM · Secrets Manager · KMS
NETWORK (VPC)   public + private subnets ×2 AZ · ALB · Security Groups
COMPUTE         GameLift (FlexMatch) · ECS / EC2 ASG · API Gateway + Lambda
DATA            RDS MySQL Multi-AZ · DynamoDB · ElastiCache · S3
ANALYTICS       Kinesis → Firehose → S3 → Glue → Athena → QuickSight (+ Flink → OpenSearch)
MONITORING      CloudWatch · SNS · X-Ray · Systems Manager
DR/RESILIENCE   RDS Multi-AZ · S3 CRR · DynamoDB Global Tables · Route 53 failover
```

Full design + diagrams: **`docs/architecture.html`** · Cost model: **`docs/pricing.html`** · DR: **`docs/DR-PLAN.md`**

---

## Tech stack

| Layer | Tech |
|-------|------|
| Console | Next.js 14 · React 18 · TanStack Query · Recharts · Tailwind |
| API | FastAPI · SQLAlchemy · PyJWT · Prometheus |
| Database | MySQL 8 / MariaDB (SQLite for zero-setup local dev) |
| Infra | Docker · Terraform · Nginx · AWS (EC2, VPC, RDS) |

---

## Quickstart

### Option 1 — Docker (full stack: MySQL + API + console)
```bash
docker compose up --build        # or: docker-compose up --build
# console → http://localhost:3100   ·   api → http://localhost:8000/docs
```

### Option 2 — Native (snappy for a live demo)
```bash
# backend (SQLite, zero setup)
cd backend && python3 -m venv .venv && .venv/bin/pip install -r requirements.txt
.venv/bin/uvicorn main:app --reload --port 8000

# frontend (new terminal) — talks to the backend
cd frontend && npm install
NEXT_PUBLIC_API_URL=http://localhost:8000 npm run dev      # → http://localhost:3000
```

### Option 3 — Console only (Vercel-style, no backend)
```bash
cd frontend && npm install && npm run dev    # leave NEXT_PUBLIC_API_URL unset
```
With no API URL the console runs a **fully self-contained in-browser simulation** — live KPIs,
RBAC, workflows, alerts, audit — so it deploys to Vercel as an always-on shareable link.

**Login:** `admin` / `manager` / `ops` · password `gamecloud123`

### Live on AWS (free-tier EC2)
See **`infra/EC2-DEPLOY.md`** — one `t3.micro` runs SSH, Linux admin, Nginx, MySQL, the VPC +
security groups, CloudWatch, and cron backups on real AWS for $0.

---

## What each role sees (RBAC)

| | Admin | Manager | Ops |
|---|:---:|:---:|:---:|
| Overview / Regions / Analytics / Alerts | ✓ | ✓ | ✓ |
| Approve / reject workflows | ✓ | ✓ | request only |
| Audit log · Executive portal | ✓ | ✓ | — |
| DR drills (region degrade/offline) | ✓ | — | — |

---

## Deliverable map (rubric → artifact)

| Rubric item | Where |
|---|---|
| Working application | the console (`frontend/` + `backend/`) |
| Cloud architecture (HA, scalability, multi-region) | `docs/architecture.html` |
| Linux administration | `scripts/setup-server.sh`, `crontab.example`, live on EC2 |
| Cloud VM deployment (Nginx, SSH, systemctl) | `infra/nginx/`, `infra/EC2-DEPLOY.md` |
| Cloud databases (MySQL, backup/recovery) | `backend/` + `scripts/backup-db.sh` / `restore-db.sh` |
| Docker & containerization | `docker-compose.yml`, `*/Dockerfile` |
| Cloud networking (VPC, subnets, SG) | `infra/terraform/` |
| Monitoring & resource management | `/metrics`, `scripts/monitor-resources.sh`, CloudWatch |
| Automation (shell scripts) | `scripts/` |
| Product (dashboards, RBAC, reporting, workflow, alerting, audit, exec) | the console |
| Pricing strategy | `docs/pricing.html` |
| Architecture + deployment diagrams | `docs/architecture.html` |
| Disaster recovery plan | `docs/DR-PLAN.md` |
| Documentation + screenshots | this README + `docs/` |

---

## Demo script (5 minutes)

1. **Login** as `admin` → **Overview**: live CCU chart ticking, KPIs across 5 regions.
2. **Regions & Fleets**: per-region fleets, CPU/mem, capacity bars. → run a **DR drill**: take `sa-east-1` offline → platform stays up, alert fires, CCU redistributes → **Restore all**.
3. **Workflows**: approve a pending request (region expansion) — note ops can't, admin can (RBAC).
4. **Alerts**: ack/resolve an alert.
5. **Audit Log**: every action you just took is recorded (DB-backed compliance).
6. **Executive**: aggregated revenue, uptime, regional performance.
7. Show **`/metrics`** (Prometheus), **`docs/architecture.html`**, **`docs/pricing.html`**, and — if deployed — the **live EC2 box** (SSH, MySQL, Nginx, VPC).

See `docs/VIVA.md` for the question bank.
