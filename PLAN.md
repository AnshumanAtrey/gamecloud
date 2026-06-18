# GameCloud — Build Plan & Presentation Playbook

**Case Study 83** · GameCloud Online Gaming & Esports Operations Platform
**Subject:** AWS (Cloud Computing) · B.Tech CSE Sem IV · ITM Skills University
**Viva:** from **Jun 19, 2026** · **Author:** Anshuman Atrey

> The deliverable is **not the game** — it's the **cloud operations platform** a gaming/esports
> company uses to run its global infrastructure: centralized dashboards, RBAC, analytics,
> reporting, workflow approvals, monitoring/alerting, and multi-region expansion — all designed
> to run on AWS, with the hands-on cloud layer demonstrated **live on a real free-tier EC2 box**.

---

## 0. Locked decisions

| Decision | Choice | Why |
|----------|--------|-----|
| Real-AWS layer | **Live free-tier `t3.micro` EC2** | Proves the entire *Technical Implementation* rubric (SSH, Linux, Nginx, MySQL, VPC, security groups, CloudWatch, cron) on **actual AWS** for $0. |
| App scope | **Full stack + sim fallback** | Next.js console + FastAPI + MySQL + RBAC + audit + workflows for full marks; self-contained sim mode = always-on Vercel link as bulletproof backup. |
| Stack | Reuse **TerraMind** skeleton | Next.js 14 + react-query + recharts + FastAPI + SQLAlchemy proven on this 8GB machine. One-line `DATABASE_URL` → MySQL. |
| Doc format | Print-grade **HTML→PDF** | Matches the System Design `029_…pdf` deliverable style the graders already accept. |

---

## 1. Research foundation (their tools are our spec)

AWS over-documents the gaming vertical — we adopt the official reference architectures, not invent.

| Source | Gives GameCloud | Link |
|--------|----------------|------|
| **Guidance for Multiplayer Session-Based Game Hosting** | Cognito → API GW → Lambda → GameLift FlexMatch → DynamoDB → SNS → CloudWatch; multi-region fleets | aws.amazon.com/solutions/guidance/multiplayer-session-based-game-hosting-on-aws |
| **Game Analytics Pipeline** (MIT-0, open-source) | Kinesis → Firehose → S3 → Glue → Athena → QuickSight (+ Flink → OpenSearch) | github.com/aws-solutions-library-samples/guidance-for-game-analytics-pipeline-on-aws |
| **Games Industry Lens** (Well-Architected, Dec 2025) | 6-pillar design language: scalability, elasticity, DR, security, cost | docs.aws.amazon.com/wellarchitected/latest/games-industry-lens |
| **Nakama** (open-source) | Embedded admin **Console** = player data + metrics + **RBAC** — prior art for our ops console | github.com/heroiclabs/nakama |
| **Agones** (open-source) | K8s game-server fleet autoscaling/health — open mirror of GameLift | agones.dev |
| **GameLift pricing** | Real numbers: `c6g.4xlarge` Graviton $0.66/hr, Spot −50–85%, Linux ~2× cheaper than Windows, bandwidth free gen-6+ | aws.amazon.com/gamelift/servers/pricing |

---

## 2. GameCloud → AWS architecture (rubric mapped to services)

```
EDGE/SECURITY   Route 53 (latency+failover) · CloudFront · WAF + Shield (DDoS) · Cognito
IDENTITY/RBAC   Cognito groups → JWT (Admin/Manager/Ops) · IAM · Secrets Manager + KMS     ← role-based access control
NETWORK (VPC)   VPC · public+private subnets × 2 AZ · ALB · NAT/IGW · Security Groups + NACL ← VPC, subnets, firewall
COMPUTE         GameLift fleets (FlexMatch, Spot+OnDemand) · ECS/EC2 ASG (console) · API GW + Lambda ← compute, elasticity
DATA            RDS MySQL/MariaDB Multi-AZ (operational records, audit) · DynamoDB · ElastiCache · S3 ← MySQL + DB records
ANALYTICS       Kinesis→Firehose→S3→Glue→Athena→QuickSight + Flink→OpenSearch              ← reporting & analytics, exec portal
MONITORING      CloudWatch (metrics/logs/alarms) → SNS · X-Ray · Systems Manager           ← monitoring & alerting
DR/RESILIENCE   RDS Multi-AZ · S3 CRR · DynamoDB Global Tables · Route 53 failover · RPO/RTO  ← DR readiness
AUTOMATION/IaC  Shell scripts (users/cron/backup/logrotate) · Terraform/CloudFormation      ← Linux admin + automation
```

**The console we build** sits at the top of this stack; everything beneath is the AWS design it's
documented to run on. On the live EC2 box, the bottom four layers (VPC/SG, EC2 compute, MySQL data,
CloudWatch monitoring, cron automation) are **real and demonstrable**.

---

## 3. Deliverable scorecard (rubric → artifact)

Legend: ✅ live · 🟡 built+documented · ⬜ todo

| # | Rubric item | Artifact | Status |
|---|-------------|----------|--------|
| 1 | Working Application | GameCloud Operations Console (Next.js + FastAPI + MySQL) | ⬜ |
| 2 | Cloud Architecture (HA, scalability, elasticity, multi-region) | `docs/architecture.html` + diagram | ⬜ |
| 3 | Linux Administration (users, perms, cron, logs) | `scripts/*.sh` on live EC2 | ⬜ |
| 4 | Cloud VM Deployment (Nginx, SSH, systemctl) | EC2 + `infra/nginx.conf` + runbook | ⬜ |
| 5 | Cloud Databases (MySQL/MariaDB, backup/recovery) | RDS design + MySQL on EC2 + `scripts/backup.sh` | ⬜ |
| 6 | Docker & Containerization | `docker-compose.yml` + Dockerfiles | ⬜ |
| 7 | Cloud Networking (VPC, subnets, SG, firewall) | `infra/terraform/` + live SG on EC2 | ⬜ |
| 8 | Monitoring & Resource Management | CloudWatch + `/metrics` (Prometheus) | ⬜ |
| 9 | Automation (shell scripts) | `scripts/` (deploy, backup, healthcheck) | ⬜ |
| 10 | Product: dashboards, RBAC, reporting, workflow, alerting, audit, exec portal | the console | ⬜ |
| 11 | Pricing Strategy | `docs/pricing.html` | ⬜ |
| 12 | Architecture + Deployment diagrams | `docs/architecture.html` | ⬜ |
| 13 | Disaster Recovery Plan | `docs/DR-PLAN.md` | ⬜ |
| 14 | Documentation + Demonstration screenshots | `README.md` + `docs/screenshots/` | ⬜ |

---

## 4. The console (Product Building rubric → pages)

| Page | Rubric line it satisfies |
|------|--------------------------|
| **Overview** | centralized operational dashboards, real-time KPIs (CCU, sessions, matches/min, revenue, fleet health) |
| **Regions & Fleets** | scalability & expansion management, multi-region/multi-city, elasticity |
| **Analytics** | reporting & analytics systems, data-driven decisions |
| **Workflows** | workflow management — approval chains, task assignments, process automation |
| **Alerts** | monitoring & alerting dashboards, proactive incident response |
| **Audit Log** | database-backed operational records — integrity, auditability, compliance |
| **Executive** | executive reporting portals — aggregated leadership insights |
| **Login / roles** | role-based access — Admin / Manager / Ops |

**RBAC matrix:** Admin = full + user mgmt + approve. Manager = approve workflows + analytics + exec.
Ops = monitor + ack alerts + *request* (not approve).

---

## 5. Build order (marks ÷ effort)

1. ✅ Scaffold + PLAN
2. **Backend** — FastAPI + MySQL + RBAC + sim loop + REST + Prometheus
3. **Frontend** — Next.js console + sim fallback
4. **Docker** — compose (frontend + backend + MySQL)
5. **Infra** — Terraform (VPC/EC2/RDS/SG) + Nginx + Linux scripts
6. **EC2 deploy** — live free-tier runbook (you run the AWS-account steps)
7. **Architecture dossier** — HTML→PDF
8. **Pricing doc** — HTML→PDF
9. **README + DR + viva Q&A + screenshots**

---

## 6. EC2 free-tier runbook (outline — full version in `infra/EC2-DEPLOY.md`)

1. Launch `t3.micro` (Amazon Linux 2023, free-tier), key pair, **VPC default + custom security group** (22 from my IP, 80/443 public).
2. `ssh` in → `dnf install` nginx mariadb105-server docker git.
3. Create Linux users/groups (`gamecloud-ops`), set permissions, enable services via `systemctl`.
4. MySQL: create DB + user, load schema, set up `cron` mysqldump → `/backups` (+ S3 optional).
5. Deploy app (docker compose or native), Nginx reverse-proxy :80 → console.
6. CloudWatch agent → CPU/mem/disk metrics + log streaming.
7. Screenshot everything (deliverable #13).

---

## 7. Honest caveats to keep (rigor, not hype)

- One `t3.micro` demonstrates the **hands-on** cloud layer on real AWS; the **full multi-region /
  GameLift / RDS-Multi-AZ design** is documented + costed, not all deployed. Say so — graders respect
  "here's the live box + the production design it scales into" over a bluff.
- The console ships a **deterministic in-browser simulation** when no backend is set — that's the
  Vercel always-on demo *and* a graceful-degradation feature, not a shortcut. State it as one.
- Pricing uses **real published AWS rates** (cited); totals are modeled estimates, labeled as such.
