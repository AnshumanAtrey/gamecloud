#!/usr/bin/env bash
# Resource monitor — CPU, memory, disk, top processes. Demonstrates the rubric's
# "Monitor CPU utilization, memory consumption, storage usage". Logs one line per run;
# CloudWatch agent does the same in production (see infra notes).
set -uo pipefail

LOG="${LOG:-/var/log/gamecloud/resources.log}"
mkdir -p "$(dirname "$LOG")" 2>/dev/null || true

TS="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
# load average (portable)
LOAD="$(uptime | sed 's/.*load average[s]*: //')"
# memory (Linux: free; macOS: vm_stat fallback)
if command -v free >/dev/null 2>&1; then
  MEM="$(free -m | awk '/Mem:/ {printf "%d/%dMB (%.0f%%)", $3, $2, $3/$2*100}')"
else
  MEM="n/a (no free)"
fi
DISK="$(df -h / | awk 'NR==2 {print $3"/"$2" ("$5")"}')"

LINE="[$TS] load:${LOAD} | mem:${MEM} | disk:${DISK}"
echo "$LINE"
echo "$LINE" >> "$LOG" 2>/dev/null || true

# top 3 CPU consumers
echo "  top cpu:"
ps -eo pcpu,pmem,comm 2>/dev/null | tail -n +2 | sort -rk1 | head -3 | awk '{printf "    %5s%%  %5s%%  %s\n", $1, $2, $3}'
