#!/bin/bash
# EC2 first-boot bootstrap (Amazon Linux 2023). Installs the toolchain and demonstrates
# Linux administration: package management, services (systemctl), users/groups, directories.
set -eux

dnf update -y
dnf install -y docker git nginx mariadb105 cronie

systemctl enable --now docker
systemctl enable --now nginx
systemctl enable --now crond

# let ec2-user drive docker without sudo
usermod -aG docker ec2-user

# dedicated service group/user + app directories with least-privilege ownership
groupadd -f gamecloud
id gamecloud >/dev/null 2>&1 || useradd -r -g gamecloud -s /sbin/nologin gamecloud
mkdir -p /opt/gamecloud /var/backups/gamecloud /var/log/gamecloud
chown -R ec2-user:ec2-user /opt/gamecloud
chown -R gamecloud:gamecloud /var/backups/gamecloud /var/log/gamecloud
chmod 750 /var/backups/gamecloud

echo "GameCloud host bootstrapped at $(date -u)" > /var/log/gamecloud/bootstrap.log
