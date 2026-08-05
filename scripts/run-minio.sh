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

echo "==> start minio (API :9000, console :9001)"
nohup "$BIN" server "$DATA" --address ":9000" --console-address ":9001" \
  > logs/minio.log 2>&1 &
echo $! > logs/pids/minio.pid

tries=60
until (echo > /dev/tcp/127.0.0.1/9000) 2>/dev/null; do
  tries=$((tries - 1))
  if [ "$tries" -le 0 ]; then
    echo "!! MinIO không lên được port 9000 — xem logs/minio.log" >&2
    exit 1
  fi
  sleep 1
done
echo "    minio OK (API http://localhost:9000, console http://localhost:9001)"
