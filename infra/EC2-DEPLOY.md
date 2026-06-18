# GameCloud — Live AWS Deployment Runbook (free-tier EC2)

The goal: one **`t3.micro`** (free-tier eligible, **$0**) running the full stack on **real AWS**, so the
*Technical Implementation* rubric — SSH, Linux admin, Nginx, MySQL, VPC + security groups, CloudWatch,
cron — is **demonstrated live**, not just diagrammed. The full multi-region / GameLift / RDS-Multi-AZ
design stays documented + costed in `docs/architecture.html` and `docs/pricing.html`.

> Time: ~20–30 min. Do a dry run before the viva. Screenshot each ✅ step (deliverable #13).

---

## 0. Prerequisites
- An AWS account (free-tier eligible).
- An EC2 **key pair** (EC2 → Key Pairs → Create; download the `.pem`).
- Your public IP: `curl ifconfig.me` → use as `YOUR_IP/32` to lock SSH down.
- *(Optional, for the Terraform path)* AWS CLI configured: `aws configure`.

---

## 1. Provision the network + host

### Path A — Terraform (recommended, one command)
```bash
cd infra/terraform
terraform init
terraform apply \
  -var="key_name=YOUR_KEYPAIR_NAME" \
  -var="my_ip_cidr=YOUR_IP/32"
# creates: VPC, 2 public + 2 private subnets (multi-AZ), IGW, route table,
#          web + db security groups, and the t3.micro app host.
terraform output            # prints ssh_command + console_url
```
Tear down after the viva: `terraform destroy`.

### Path B — Console click-through (no CLI)
1. **VPC** → Create VPC → "VPC and more" → name `gamecloud`, 2 AZs, 2 public + 2 private subnets. Create.
2. **EC2 → Launch instance**: Amazon Linux 2023, **t3.micro**, your key pair, the `gamecloud` VPC + a public subnet, **auto-assign public IP = Enable**.
3. **Security group** — inbound: SSH 22 from *My IP*, HTTP 80 from Anywhere, HTTPS 443 from Anywhere, 3100 + 8000 from *My IP*. Launch.

*(This is the "VPC, subnets, IP addressing, public/private access, firewall rules, security groups" rubric item — point at the SG + subnet map.)*

---

## 2. Connect + bootstrap the host
```bash
ssh -i YOUR_KEY.pem ec2-user@<public-dns>          # rubric: secure SSH access

# clone the project (make the repo public or use a deploy key / scp the folder)
sudo dnf install -y git
git clone https://github.com/<you>/gamecloud.git /opt/gamecloud   # or: scp -r ./gamecloud ec2-user@<dns>:/opt/
cd /opt/gamecloud

# Linux administration: packages, users/groups, permissions, services, nginx, logrotate
./scripts/setup-server.sh
```
`setup-server.sh` installs Docker, Nginx, MariaDB client, git, cron; creates the `gamecloud`
user/group + `/opt/gamecloud`, `/var/backups/gamecloud`, `/var/log/gamecloud`; installs the Nginx site
+ logrotate. *(rubric: Linux Administration + Cloud VM Deployment)*

---

## 3. Bring up the application

### Option A — Docker (matches the deliverable)
```bash
sudo dnf install -y docker
sudo systemctl enable --now docker
# install the compose plugin if absent:
sudo mkdir -p /usr/libexec/docker/cli-plugins && sudo curl -SL \
  https://github.com/docker/compose/releases/latest/download/docker-compose-linux-x86_64 \
  -o /usr/libexec/docker/cli-plugins/docker-compose && sudo chmod +x /usr/libexec/docker/cli-plugins/docker-compose
sudo docker compose up -d --build         # mysql + backend + frontend
```

### Option B — Native (snappier for a live demo)
```bash
# MySQL on the box (rubric: Cloud Databases — MySQL/MariaDB)
sudo dnf install -y mariadb105-server && sudo systemctl enable --now mariadb
sudo mysql -e "CREATE DATABASE gamecloud CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci; CREATE USER 'gamecloud'@'localhost' IDENTIFIED BY 'gamecloud_pw'; GRANT ALL ON gamecloud.* TO 'gamecloud'@'localhost'; FLUSH PRIVILEGES;"   # utf8mb4: MariaDB defaults to latin1 and rejects multi-byte text

# backend
cd /opt/gamecloud/backend && python3 -m venv .venv && .venv/bin/pip install -r requirements.txt
DATABASE_URL="mysql+pymysql://gamecloud:gamecloud_pw@127.0.0.1:3306/gamecloud" \
  .venv/bin/uvicorn main:app --host 0.0.0.0 --port 8000 &

# frontend (built to talk to the box's public URL via Nginx)
cd /opt/gamecloud/frontend && npm ci
NEXT_PUBLIC_API_URL="http://<public-dns>" npm run build && npm start -- -p 3100 &
```
Nginx (already installed by `setup-server.sh`) reverse-proxies `:80` → console `:3100` and `/api` → `:8000`,
so the public URL is a single clean origin.

---

## 4. Database backups (rubric: backup & recovery)
```bash
# nightly dump + 7-day rotation (+ optional S3); install the schedule:
crontab /opt/gamecloud/scripts/crontab.example
# prove it on demand:
DB_PASS=gamecloud_pw ./scripts/backup-db.sh        # → /var/backups/gamecloud/*.sql.gz
# recovery:
./scripts/restore-db.sh /var/backups/gamecloud/<dump>.sql.gz
```

## 5. Monitoring (rubric: monitoring & resource management)
```bash
# A) app metrics — already exposed:
curl http://<public-dns>/metrics      # gamecloud_ccu, gamecloud_active_alerts, …
# B) host metrics — CloudWatch agent (CPU/mem/disk → CloudWatch dashboards + alarms):
sudo dnf install -y amazon-cloudwatch-agent
sudo /opt/aws/amazon-cloudwatch-agent/bin/amazon-cloudwatch-agent-ctl \
  -a fetch-config -m ec2 -c default -s
# C) lightweight cron snapshot (no agent): scripts/monitor-resources.sh (already scheduled)
```

---

## 6. Verify + screenshot (deliverable #13)
| ✅ | What | Where |
|----|------|-------|
| ☐ | Console live | `http://<public-dns>` (login admin/manager/ops) |
| ☐ | SSH session | terminal showing `ec2-user@ip` + `systemctl status nginx mariadb` |
| ☐ | VPC + security group | EC2 console — SG inbound rules, subnet map |
| ☐ | MySQL | `mysql -e "SHOW TABLES" gamecloud` (7 tables) |
| ☐ | Nginx | `nginx -t` + the proxied site |
| ☐ | Backup | `ls -lh /var/backups/gamecloud/` + a cron line |
| ☐ | Metrics | `/metrics` output + CloudWatch CPU graph |
| ☐ | DR drill | console → Regions → degrade/offline a region → platform stays up |

## 7. Teardown (avoid surprise charges)
```bash
cd infra/terraform && terraform destroy      # Path A
# or terminate the instance + delete the VPC in the console (Path B)
```

> **Honest framing for the viva:** "This single free-tier box runs the hands-on cloud layer on real
> AWS — SSH, Linux, Nginx, MySQL, the VPC/security-group it lives in, CloudWatch, cron backups. The
> full multi-region, GameLift, and RDS-Multi-AZ design is in the architecture dossier and costed in the
> pricing model — that's the production target this box scales into."
