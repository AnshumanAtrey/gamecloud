# GameCloud — Viva Question Bank

Crisp answers for the AWS Case Study 83 evaluation. Lead with the one-liner; expand if pressed.

---

## A. Project & framing

**Q: What is GameCloud — the game?**
No — it's the **cloud operations platform** a gaming/esports company runs its business on:
centralized dashboards, RBAC, analytics, approval workflows, alerting, audit, and multi-region
expansion. The game-serving infrastructure is part of the *architecture* it manages.

**Q: Walk me through the architecture in one breath.**
Nine tiers: edge/security (Route 53, CloudFront, WAF/Shield, Cognito) → VPC (public+private subnets,
ALB, security groups) → compute (GameLift fleets, ECS/EC2, API Gateway+Lambda) → data (RDS MySQL,
DynamoDB, ElastiCache, S3) → analytics (Kinesis→Firehose→S3→Glue→Athena→QuickSight) → monitoring
(CloudWatch) → DR (Multi-AZ, S3 CRR, Route 53 failover) → IaC (Terraform).

**Q: What's actually running vs designed?**
Live on a free-tier EC2 box: the console, MySQL data tier, VPC + security groups, monitoring metrics,
cron backups. Documented + costed as the production target: GameLift fleets, the serverless analytics
pipeline, RDS Multi-AZ, multi-region edge. I'm explicit about which is which.

---

## B. Compute, scalability, elasticity

**Q: How does it scale with player demand (elasticity)?**
Game servers run on **GameLift fleets** that auto-scale on concurrent users (CCU) using a Spot +
On-Demand blend; the console tier runs on **ECS Fargate / EC2 Auto Scaling** with target-tracking on
CPU and request count; analytics is **serverless** (Kinesis on-demand, Lambda, Athena) so it scales to
demand and to zero.

**Q: Scalability vs elasticity — the difference?**
Scalability is the *ability* to handle more load (add capacity); elasticity is doing it
*automatically, both up and down*, with demand. GameCloud is both: ASGs/GameLift add capacity, and
scale back when CCU drops — you pay for what you use.

**Q: Why GameLift instead of plain EC2 for game servers?**
GameLift is purpose-built: FlexMatch matchmaking, multi-region fleet placement on player latency,
session management, and FleetIQ Spot orchestration (50–85% cheaper) with an on-demand backstop. Doing
that on raw EC2 means rebuilding all of it. Open-source alternative: Agones on EKS — I can speak to it.

---

## C. Networking & VPC

**Q: Explain your VPC design.**
One VPC, **public subnets** (web tier — ALB, bastion) and **private subnets** (data tier — RDS) across
**2 Availability Zones** for HA. An Internet Gateway for public egress; the EC2 host sits in a public
subnet with a security group allowing SSH from my IP only, HTTP/HTTPS from anywhere.

**Q: Security groups vs NACLs?**
Security groups are **stateful**, instance-level, allow-only. NACLs are **stateless**, subnet-level,
allow+deny. I use SGs for tier isolation (the DB SG only accepts 3306 from the web SG) and NACLs as a
coarse subnet backstop.

**Q: How is the database protected at the network layer?**
RDS lives in private subnets with no public route; its security group only permits MySQL (3306) from
the web-tier security group — nothing else can reach it.

---

## D. Databases

**Q: Why MySQL/MariaDB, and what's in it?**
MySQL/MariaDB (RDS Multi-AZ in production) holds the **operational system of record**: users, regions,
fleets, workflows, alerts, and the append-only audit log — relational, transactional, with referential
integrity for compliance. Live KPIs are snapshotted into it every 15 s for durable history.

**Q: Why DynamoDB *and* RDS?**
Right tool per job: **DynamoDB** for high-throughput, single-digit-ms session/leaderboard/matchmaking
data at scale; **RDS MySQL** for relational operational records and audit. The AWS multiplayer
reference architecture uses DynamoDB for exactly this.

**Q: Backup and recovery?**
RDS automated backups + point-in-time recovery + cross-region snapshot copy in production;
demonstrated locally by `backup-db.sh` (nightly mysqldump, 7-day rotation, optional S3) and
`restore-db.sh`. Tiered RPO/RTO — accounts < 1 min RPO, telemetry < 15 min (see DR-PLAN.md).

---

## E. Containers, monitoring, automation

**Q: How is it containerized?**
Multi-stage Dockerfiles for the API (Python) and console (Next.js standalone) + a `docker-compose.yml`
that brings up MySQL + backend + frontend with one command. In production these images run on ECS;
GameLift runs the containerized game-server build.

**Q: Monitoring?**
The API exposes **Prometheus metrics** (`/metrics`: CCU, sessions, latency, active alerts, regions
online); on AWS, **CloudWatch** collects host + app metrics, dashboards, and alarms → SNS for paging;
`monitor-resources.sh` logs CPU/mem/disk and the CloudWatch agent does this on EC2.

**Q: What did you automate with shell scripts?**
Server setup (packages, users/groups, permissions, services), DB backup + restore, health checks with
auto-restart, resource monitoring, and deploy — scheduled via cron (`crontab.example`).

---

## F. HA, DR, security

**Q: How do you achieve high availability?**
Every tier spans ≥ 2 AZs; ALB health-checks and sheds bad targets; RDS Multi-AZ synchronous standby
with auto-failover; stateless app tier behind Auto Scaling; S3/DynamoDB are inherently multi-AZ.

**Q: A region goes down mid-evaluation — show me.**
*(Do the live drill.)* Admin → Regions → take a region offline: a critical alert fires, that region
drops to zero, fleets show offline, and the platform keeps serving the healthy regions; Restore
recovers it. In production Route 53 health-checked failover + GameLift queues do this automatically.

**Q: How is access controlled (RBAC)?**
Cognito identity → JWT carrying a group→role claim: **Admin** (full + DR + user mgmt), **Manager**
(approve + analytics + exec), **Ops** (monitor + ack + request, not approve). The UI gates by role and
the API re-checks server-side — try approving a workflow as `ops`, you get a 403.

---

## G. Pricing / cost (see pricing.html)

**Q: What drives cost, and how do you optimize it?**
Game-server compute dominates (scales with CCU); the platform is a small fixed slice. Top levers:
**Spot** fleets (50–85% off), **Graviton** ARM (~20% better price/perf), **Linux** over Windows (~2×
cheaper), **Savings Plans** for the baseline, **S3 tiering**, and **scale-to-zero** serverless
analytics. Net: the same 50k-CCU workload drops from ~$118k/mo to ~$54k/mo — ~59% — with a *stronger*
availability posture.

**Q: Is GameLift bandwidth expensive?**
No — network bandwidth is **free on generation-6+ instances**, which is a major reason to standardize
on c6g/c6gn Graviton fleets.

---

## H. Likely "gotchas"

**Q: Isn't the live data fake?**
The telemetry is a deterministic **simulation** of player demand — that's standard for a demo without
a live player base, and it's a *feature*: it doubles as the graceful-degradation fallback when the
backend is unreachable. All **operational records** (users, workflows, alerts, audit) are real rows in
MySQL — show the `SHOW TABLES` output.

**Q: Where does all this data come from? (know this cold)**
Two kinds — be honest about the split, it's your strongest answer:
- **Real — rows in MySQL on the EC2 box:** the 3 users (admin/manager/ops), 5 regions, 10 fleets,
  workflows, and alerts are seeded from `backend/seed_data.py`. The **audit log is genuinely real** — it
  records every actual privileged action (your logins, approvals, the DR drill). Prove it:
  `mysql -ugamecloud -pgamecloud_pw gamecloud -e "SELECT actor,action,entity FROM audit_log ORDER BY id DESC LIMIT 6;"`
- **Simulated — the live numbers:** CCU, revenue, latency, the moving chart, per-fleet CPU/mem are
  computed by a simulation engine I wrote (`backend/simulation.py`, class `GameCloudSim`) — a time-of-day
  curve + randomness, ticked **every second** by a background loop in `main.py`, and **persisted to MySQL
  every 15s** (the `kpi_snapshots` table). There are **no real players or game servers** — it models what
  a gaming platform's telemetry looks like.
- **The honest line:** *"Operational records are real in MySQL; the live telemetry is a simulation I
  built, because a demo has no real game with live players behind it. The case study is the cloud
  architecture and operations platform around the data — and that's all real and running on AWS."*
  The brief says the app may be simple; simulating telemetry is standard, and owning it beats a bluff
  that dies under one follow-up.

**Q: Why is some of it 'designed' not deployed?**
Honest engineering trade-off: a full multi-region GameLift + RDS-Multi-AZ deployment costs real money
and time. One free-tier box proves the hands-on cloud layer on real AWS; the rest is documented and
costed as the production target — examiners respect "here's what runs + here's the design it scales
into" over a bluff that breaks under one question.
