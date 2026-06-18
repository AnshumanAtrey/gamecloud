# GameCloud — Viva Demo Runbook (exact things to show)

**Live URL:** http://44.202.179.146  ·  http://ec2-44-202-179-146.compute-1.amazonaws.com
**Login:** `admin` / `manager` / `ops` · password `gamecloud123`
**SSH:** `ssh -i ~/.ssh/gamecloud ec2-user@44.202.179.146`

> Resources are under **EC2** and **VPC** consoles (NOT the "My Applications" widget — that's a
> separate opt-in feature; empty is normal). Everything below is live in **us-east-1**.

---

## PART 1 — The live product (your star, ~3 min)
Open **http://44.202.179.146**, log in as **admin**.
1. **Overview** — "GameCloud runs a global gaming platform on AWS." Point at: live CCU chart ticking, 6 KPIs, 5 regions, fleet capacity. Note the green **"Live backend"** badge (it's talking to the real EC2 API).
2. **Regions & Fleets** → scroll the per-region fleets (Graviton instance types, CPU/mem). Then the **DR drill**: click **offline** on a region → *"a cloud region just went down"* → critical alert fires, that region → 0 CCU, **the platform keeps serving the others** → click **Restore all**. *(This is the rubric's "simulate cloud-region outage", live.)*
3. **Workflows** → **Approve** a pending request. Say: *"role-gated — I'm admin."*
4. **(RBAC proof)** open a 2nd tab as **ops** → Workflows has **no approve buttons**, and **no Audit/Executive** in the nav. *(Or just show `docs/screenshots/07-rbac-403.png`.)*
5. **Audit Log** — "every privileged action is written to MySQL — compliance/auditability."
6. **Executive** — aggregated revenue, uptime, regional performance.

---

## PART 2 — Proof it's real AWS (~2 min)
Open the AWS Console (region **N. Virginia / us-east-1**):
- **EC2 → Instances** — your running `t3.micro` **i-0d7b767a1b86046ab** (44.202.179.146).
  https://us-east-1.console.aws.amazon.com/ec2/home?region=us-east-1#Instances:
- **VPC → Your VPCs** — **vpc-05bffc78ba649c40b** (10.0.0.0/16).
  https://us-east-1.console.aws.amazon.com/vpcconsole/home?region=us-east-1#vpcs:
- **VPC → Subnets** — **4 subnets, 2 public + 2 private, across us-east-1a & 1b** (multi-AZ HA).
  https://us-east-1.console.aws.amazon.com/vpcconsole/home?region=us-east-1#subnets:
- **EC2 → Security Groups** — **gamecloud-web-sg** (SSH/80/443) + **gamecloud-db-sg** (MySQL only from web tier — least privilege).
  https://us-east-1.console.aws.amazon.com/ec2/home?region=us-east-1#SecurityGroups:

*(Tip: in the EC2 instances list, also click the instance → "Monitoring" tab for the CloudWatch CPU graph.)*

---

## PART 3 — On the box: Linux, services, MySQL (~2 min)
```bash
ssh -i ~/.ssh/gamecloud ec2-user@44.202.179.146

# services managed by systemd (rubric: systemctl)
systemctl status gamecloud-backend gamecloud-frontend nginx mariadb --no-pager | grep -E "●|Active"

# database-backed operational records (rubric: MySQL/MariaDB)
mysql -ugamecloud -pgamecloud_pw gamecloud -e "SHOW TABLES; SELECT COUNT(*) AS audit_rows FROM audit_log;"

# Nginx reverse proxy (rubric: Cloud VM deployment)
cat /etc/nginx/conf.d/gamecloud.conf

# live backup (rubric: backup & recovery)
cd ~/gamecloud && BACKUP_DIR=~/backups DB_PASS=gamecloud_pw bash scripts/backup-db.sh && ls -lh ~/backups
```

---

## PART 4 — API, monitoring, design, IaC (~1 min)
- **Swagger API docs:** http://44.202.179.146/docs (15 endpoints, Authorize for JWT)
- **Prometheus metrics:** http://44.202.179.146/metrics (`gamecloud_ccu`, `gamecloud_active_alerts`, …)
- **Architecture + cost:** open `docs/architecture.html` and `docs/pricing.html` (print → PDF)
- **Infrastructure as Code:** show `infra/terraform/main.tf` — *"the whole thing is reproducible: `terraform apply` built the VPC, subnets, security groups, and EC2."*

---

## If something breaks (stay calm)
- **Site down?** `ssh` in → `sudo systemctl restart gamecloud-backend gamecloud-frontend nginx` → wait 10s.
- **SSH refused?** SSH is open to all (key required); make sure you're using `-i ~/.ssh/gamecloud`.
- **Worst case:** the **12 screenshots in `docs/screenshots/`** + this runbook are your backup evidence (the professor explicitly allows recordings/screenshots for downtime).

## One-line pitch to open with
> "GameCloud is the cloud operations platform a global gaming company runs on — live dashboards, RBAC,
> analytics, approval workflows, alerting, and audit. It's running right now on AWS: a VPC with
> multi-AZ subnets, a t3.micro behind Nginx, MySQL, CloudWatch-style metrics, and Terraform-provisioned
> infrastructure. Let me show you."
