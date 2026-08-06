#!/usr/bin/env bash
# Dừng frontend, backend/AI và hạ tầng local do scripts/start-all.sh khởi động.
set -uo pipefail
cd "$(dirname "$0")/.."

if ! ls logs/pids/*.pid >/dev/null 2>&1; then
  echo "Không có PID file nào trong logs/pids/ — stack chưa chạy?"
  exit 0
fi

stop_one() {
  local name=$1 pidfile="logs/pids/$1.pid" pid expected cmdline
  [ -f "$pidfile" ] || return
  pid=$(cat "$pidfile")

  case "$name" in
    frontend) expected="vite" ;;
    mysql) expected="mysqld" ;;
    mongodb) expected="mongod" ;;
    minio) expected="minio" ;;
    *) expected="$name" ;;
  esac

  if kill -0 "$pid" 2>/dev/null; then
    cmdline=$(tr '\0' ' ' < "/proc/$pid/cmdline" 2>/dev/null || true)
    if [[ "$cmdline" == *"$expected"* ]]; then
      echo "==> stop $name ($pid)"
      kill "$pid"
    else
      echo "==> bo qua $name: PID $pid da duoc tien trinh khac su dung"
    fi
  else
    echo "==> $name ($pid) da dung san"
  fi
  rm -f "$pidfile"
}

# Dừng application trước để chúng không tiếp tục gọi database/object storage.
for name in frontend api-gateway ai-service identity-service profile-service \
  notification-service post-service file-service chat-service social-service \
  interaction-service group-service moderation-service; do
  stop_one "$name"
done

for name in minio mongodb mysql; do
  stop_one "$name"
done

echo "==> Xong. Neu dung Docker infra: docker compose -f docker-compose.infra.yml down"
