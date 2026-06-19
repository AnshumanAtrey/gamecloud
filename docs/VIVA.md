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

---

## I. Infrastructure-as-Code, Linux deployment & scope

**Q: Did you use Terraform / Infrastructure as Code?**
Yes — **all** the AWS infrastructure is provisioned by Terraform (`infra/terraform/`). One `terraform
apply` created **14 live resources**: the VPC (10.0.0.0/16), 4 subnets (2 public + 2 private across
2 AZs), the internet gateway + route tables, both security groups, and the EC2 instance — reproducible
and version-controlled. `terraform destroy` tears it all down. RDS Multi-AZ MySQL is in the same config
behind an `enable_rds` flag. (Show `terraform state list` and `infra/terraform/main.tf`.)

**Q: Walk me through deploying it on the EC2 box (Linux administration).**
Amazon Linux 2023 `t3.micro`. I SSH in with a key pair; installed the stack (MariaDB server, Nginx,
Node, Python 3.11) via `dnf`; created a dedicated `gamecloud` user/group with least-privilege directory
permissions; and run the API and console as **systemd services** — `systemctl status gamecloud-backend
gamecloud-frontend nginx mariadb` — so they auto-restart and survive reboots. **Nginx** reverse-proxies
:80 → the console and `/api` → FastAPI (single origin). **Cron** runs `backup-db.sh` for nightly MySQL
dumps. That's the Linux Administration + Cloud VM Deployment + Automation rubric items, live on AWS.

**Q: Where's your Jenkins / Kubernetes / CI-CD pipeline? (know this — don't get rattled)**
Those aren't part of this case study. **AWS Case Study 83 (GameCloud)** is cloud architecture, Linux,
VM deployment, MySQL, Docker, VPC, monitoring, and automation — all done. **Jenkins, Kubernetes, ELK,
and Vault belong to the *DevOps* case study (TerraMind / PS124)** — that's my separate DevOps viva,
where they're built. For GameCloud, my IaC is **Terraform** and containerization is **Docker +
docker-compose**. If you'd like, I can outline how I'd bolt on CI/CD — GitHub Actions or Jenkins that
builds the images and runs `terraform apply` on a push — but it's outside this rubric.

**Q: Is it containerized? Did you use Docker?**
Yes — multi-stage Dockerfiles for the API (Python) and console (Next.js standalone) + a
`docker-compose.yml` that brings up MySQL + backend + frontend with one command. Both images build
clean. On the live box I run the services natively under systemd (lighter on a 1 GB t3.micro); in
production they'd run as containers on ECS — same images.

---

## J. Networking fundamentals — IP addresses & subnetting (panelist asked this)

**Q: What is an IP address, and what are its types?**
An IP address identifies a device on a network. **IPv4** is a 32-bit number written as four octets,
each 0–255 (e.g. `10.0.0.19`); **IPv6** is 128-bit. Types to know:
- **IPv4 vs IPv6** — 32-bit vs 128-bit.
- **Public vs Private** — public is routable on the internet; private is internal only. Private ranges
  (memorize): **10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16**. My VPC uses **10.0.0.0/16** — a private
  range, exactly as AWS expects.
- **Static vs Dynamic** — fixed, vs assigned automatically by DHCP.
- **Classes (older classful scheme):** A (1–126), B (128–191), C (192–223), D = multicast (224–239),
  E = reserved (240–255). `127.x` is loopback (`127.0.0.1` = localhost).
- **Special addresses in every subnet:** the **network address** (first, all host bits 0), the
  **broadcast address** (last, all host bits 1), the **gateway** (usually the first usable, `.1`), and
  the **usable host range** in between.

**Q: How many subnets can you make from an IP / network?**
It depends on the subnet mask — how many bits you borrow for the subnet part. Two formulas:
- **Subnets** = 2^(bits borrowed) = 2^(new prefix − old prefix)
- **Usable hosts per subnet** = 2^(32 − prefix) − 2  (subtract 2 for network + broadcast)

**My project, concretely:** the VPC is **10.0.0.0/16** and I carve **/24** subnets.
- Subnets: 2^(24 − 16) = 2^8 = **256** possible /24 subnets.
- Hosts each: 2^(32 − 24) − 2 = 256 − 2 = **254** usable. On **AWS it is 251**, because AWS reserves
  5 IPs per subnet (network, VPC router `.1`, DNS `.2`, future use `.3`, broadcast).
- I used **4** of those 256: two public + two private, across two Availability Zones.

**Quick way to remember (drill this):**
- Powers of 2: **2, 4, 8, 16, 32, 64, 128, 256**.
- **Subnets** = 2 ^ (the slash difference). /16 to /24 is a jump of 8 → 2^8 = **256**.
- **Hosts** = (32 − the slash) as a power of 2, then − 2. /24 → 32−24=8 → 2^8=256 → −2 = **254**.
- Addresses by prefix (each step up halves it): **/24=256, /25=128, /26=64, /27=32, /28=16, /29=8, /30=4**.
- Private-range mnemonic: **"10 · 172.16 · 192.168"**.

**One-line answer to give:** *"It depends on the mask. My VPC is 10.0.0.0/16; carving /24s gives 256
subnets of 254 hosts each — 251 usable on AWS, which reserves 5 per subnet. I used 4: two public,
two private, across two AZs."*
