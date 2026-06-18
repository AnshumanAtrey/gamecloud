# Demonstration Screenshots (deliverable #13)

Capture these from your own run — graders want *your* demo evidence, and the Entrepreneurship
email explicitly says keep screenshots ready as a downtime backup. Save each as a PNG in this folder.

## The console (start the stack first — see root README)
1. **`01-login.png`** — the login screen (role chips: Admin / Manager / Ops).
2. **`02-overview.png`** — Overview: live CCU chart, the 6 KPI cards, region strip, fleet capacity.
3. **`03-regions.png`** — Regions & Fleets: per-region fleet tables, CPU/mem bars, the DR-drill bar (admin).
4. **`04-dr-drill.png`** — a region taken **offline** → critical alert + platform still serving (the money shot).
5. **`05-analytics.png`** — Analytics: CCU / revenue / latency charts + CCU-by-region bars.
6. **`06-workflows.png`** — Workflows: approve/reject buttons (logged in as admin/manager).
7. **`07-rbac-403.png`** — logged in as **ops**, the approve buttons are gone (and the API returns 403).
8. **`08-alerts.png`** — Alerts: ack / resolve actions.
9. **`09-audit.png`** — Audit Log: the actions you just took, recorded in MySQL.
10. **`10-executive.png`** — Executive portal: revenue, uptime, regional performance.

## The AWS / infra evidence
11. **`11-metrics.png`** — `http://localhost:8000/metrics` showing `gamecloud_ccu`, `gamecloud_active_alerts`, …
12. **`12-swagger.png`** — `http://localhost:8000/docs` (the FastAPI OpenAPI explorer).
13. **`13-mysql-tables.png`** — `mysql -e "SHOW TABLES; SELECT COUNT(*) FROM audit_log;" gamecloud` (DB-backed records).
14. **`14-docker.png`** — `docker compose ps` (or `docker images`) showing the 3 services / images.
15. **`15-architecture.png`** — `docs/architecture.html` (print-to-PDF or screenshot the layered diagram).
16. **`16-pricing.png`** — `docs/pricing.html` cost tables.

## If you do the live EC2 deploy (infra/EC2-DEPLOY.md)
17. **`17-ssh.png`** — the SSH session + `systemctl status nginx mariadb`.
18. **`18-ec2-sg.png`** — the EC2 console: VPC, subnets, security-group inbound rules.
19. **`19-cloudwatch.png`** — CloudWatch CPU/memory graph for the instance.
20. **`20-backup.png`** — `ls -lh /var/backups/gamecloud/` + a cron line.

> Tip: macOS screenshot to file = ⌘⇧4 then space (window) or drag (region); it saves to Desktop —
> move into this folder and rename per the list.
