#!/usr/bin/env bash
# Chạy toàn bộ stack ChillNet với heap đã cap (tổng ~3GB cho 10 JVM).
# Yêu cầu trước khi chạy:
#   1. Hạ tầng đã lên:  docker compose -f docker-compose.infra.yml up -d
#   2. Đã build:        scripts/build-all.sh
#   3. export JWT_SIGNER_KEY=<chuỗi bí mật HS512>   (bắt buộc)
#      (CLIENT_ID/CLIENT_SECRET/GOOGLE_REDIRECT_URI, CLOUD_NAME/API_KEY/API_SECRET,
#       BREVO_APIKEY là tùy chọn — thiếu thì Google login / upload ảnh / email không hoạt động,
#       nhưng service vẫn khởi động được.)
set -euo pipefail
cd "$(dirname "$0")/.."

: "${JWT_SIGNER_KEY:?Cần export JWT_SIGNER_KEY trước khi chạy (identity-service không có default)}"

mkdir -p logs/pids

declare -A HEAP=(
  [api-gateway]=320m
  [identity-service]=256m
  [profile-service]=256m
  [notification-service]=256m
  [post-service]=384m
  [file-service]=384m
  [chat-service]=256m
  [social-service]=256m
  [interaction-service]=256m
  [group-service]=256m
)

declare -A PORT=(
  [api-gateway]=8080
  [identity-service]=8081
  [profile-service]=8082
  [notification-service]=8083
  [post-service]=8084
  [file-service]=8085
  [chat-service]=8086
  [social-service]=8087
  [interaction-service]=8088
  [group-service]=8089
)

start() {
  local svc=$1
  local jar
  jar=$(ls "$svc"/target/*.jar 2>/dev/null | head -1)
  if [ -z "$jar" ]; then
    echo "!! Chưa build $svc — chạy scripts/build-all.sh trước." >&2
    exit 1
  fi
  echo "==> start $svc (-Xmx${HEAP[$svc]}, :${PORT[$svc]})"
  nohup java -Xmx"${HEAP[$svc]}" -jar "$jar" > "logs/$svc.log" 2>&1 &
  echo $! > "logs/pids/$svc.pid"
}

wait_port() {
  local svc=$1 tries=90
  until (echo > /dev/tcp/127.0.0.1/"${PORT[$svc]}") 2>/dev/null; do
    tries=$((tries - 1))
    if [ "$tries" -le 0 ]; then
      echo "!! $svc không lên được port ${PORT[$svc]} — xem logs/$svc.log" >&2
      exit 1
    fi
    sleep 1
  done
  echo "    $svc OK (:${PORT[$svc]})"
}

# identity-service lên trước (gateway introspect token qua nó, các service khác Feign tới nhau sau).
start identity-service
wait_port identity-service

for svc in profile-service notification-service post-service file-service chat-service \
  social-service interaction-service group-service api-gateway; do
  start "$svc"
done

for svc in profile-service notification-service post-service file-service chat-service \
  social-service interaction-service group-service api-gateway; do
  wait_port "$svc"
done

echo "==> Toàn bộ stack đã lên. Gateway: http://localhost:8080 — dừng bằng scripts/stop-all.sh"
