#!/usr/bin/env bash
# Chạy MinIO (object storage cho file-service) như một tiến trình local, giống
# cách mysqld/mongod đang chạy từ .runtime/bin — máy này không dùng docker.
#
#   Chạy:  scripts/run-minio.sh
#   Dừng:  kill "$(cat logs/pids/minio.pid)"
#
# Credential và bucket phải khớp default trong file-service/application.yaml.
set -euo pipefail
cd "$(dirname "$0")/.."

if [ -f .env ]; then
  set -a
  # shellcheck disable=SC1091
  . ./.env
  set +a
fi

MINIO_API_PORT="${MINIO_API_PORT:-9000}"
MINIO_CONSOLE_PORT="${MINIO_CONSOLE_PORT:-9001}"

BIN=.runtime/bin/minio
DATA=.runtime-data/minio

if [ ! -x "$BIN" ]; then
  echo "!! Chưa có $BIN — tải về:" >&2
  echo "   curl -sSL -o $BIN https://dl.min.io/server/minio/release/linux-amd64/minio && chmod +x $BIN" >&2
  exit 1
fi

if [ -f logs/pids/minio.pid ] && kill -0 "$(cat logs/pids/minio.pid)" 2>/dev/null; then
  echo "MinIO đã chạy sẵn (pid $(cat logs/pids/minio.pid))"
  exit 0
fi

mkdir -p "$DATA" logs/pids

export MINIO_ROOT_USER="${MINIO_ACCESS_KEY:-chillnet}"
export MINIO_ROOT_PASSWORD="${MINIO_SECRET_KEY:-chillnet814362}"

echo "==> start minio (API :$MINIO_API_PORT, console :$MINIO_CONSOLE_PORT)"
nohup "$BIN" server "$DATA" --address ":$MINIO_API_PORT" --console-address ":$MINIO_CONSOLE_PORT" \
  > logs/minio.log 2>&1 &
echo $! > logs/pids/minio.pid

tries=60
until (echo > "/dev/tcp/127.0.0.1/$MINIO_API_PORT") 2>/dev/null; do
  tries=$((tries - 1))
  if [ "$tries" -le 0 ]; then
    echo "!! MinIO không lên được port $MINIO_API_PORT — xem logs/minio.log" >&2
    exit 1
  fi
  sleep 1
done
echo "    minio OK (API http://localhost:$MINIO_API_PORT, console http://localhost:$MINIO_CONSOLE_PORT)"
