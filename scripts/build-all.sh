#!/usr/bin/env bash
# Build toàn bộ ChillNet: install 2 shared lib vào ~/.m2 trước, rồi package 10 service.
# Yêu cầu: JDK 17. Nếu không có `mvn` trong PATH, script dùng mvnw của post-service cho shared libs.
set -euo pipefail
cd "$(dirname "$0")/.."

# Shared libs không có mvnw wrapper — ưu tiên mvn, fallback sang wrapper của post-service.
MVN="mvn"
if ! command -v mvn >/dev/null 2>&1; then
  MVN="$(pwd)/post-service/mvnw"
fi

for lib in shared-common shared-contacts; do
  echo "==> install $lib"
  (cd "$lib" && "$MVN" -q clean install -DskipTests)
done

SERVICES=(api-gateway identity-service profile-service notification-service post-service \
  file-service chat-service social-service interaction-service group-service)
for svc in "${SERVICES[@]}"; do
  echo "==> package $svc"
  (cd "$svc" && ./mvnw -q clean package -DskipTests)
done
echo "==> Build xong toàn bộ."
