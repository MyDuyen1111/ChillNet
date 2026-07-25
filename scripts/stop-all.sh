#!/usr/bin/env bash
# Dừng toàn bộ service đã chạy bằng scripts/run-all.sh (theo PID files trong logs/pids/).
set -uo pipefail
cd "$(dirname "$0")/.."

if ! ls logs/pids/*.pid >/dev/null 2>&1; then
  echo "Không có PID file nào trong logs/pids/ — stack chưa chạy?"
  exit 0
fi

for pidfile in logs/pids/*.pid; do
  pid=$(cat "$pidfile")
  name=$(basename "$pidfile" .pid)
  if kill -0 "$pid" 2>/dev/null; then
    echo "==> stop $name ($pid)"
    kill "$pid"
  else
    echo "==> $name ($pid) đã dừng sẵn"
  fi
  rm -f "$pidfile"
done
echo "==> Xong. (Hạ tầng dừng riêng: docker compose -f docker-compose.infra.yml down)"
